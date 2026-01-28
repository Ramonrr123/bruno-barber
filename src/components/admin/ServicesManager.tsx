import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Clock, DollarSign, Scissors, Edit, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Service } from '@/types/booking';
import { notification } from '@/hooks/useNotification';
import { showConfirm as confirm } from '@/hooks/useConfirm';

interface ServicesManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServiceFormData {
  name: string;
  price: number;
  durationMinutes: number;
  durationHours: number;
  description: string;
}

export function ServicesManager({ isOpen, onClose }: ServicesManagerProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceFormData>({
    name: '',
    price: 0,
    durationMinutes: 30,
    durationHours: 0,
    description: '',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null); // Para rastrear imagem original ao editar
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar serviços
  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        notification.error('Usuário não autenticado');
        setIsLoading(false);
        return;
      }

      // Buscar TODOS os serviços (públicos) independente de user_id
      // Se no futuro quiser filtrar por user_id, descomente a linha .eq('user_id', user.id)
      let { data, error } = await supabase
        .from('services')
        .select('*')
        // .eq('user_id', user.id) // Comentado para buscar todos os serviços públicos
        .order('name', { ascending: true });

      // Se der erro, tentar buscar sem filtro
      if (error) {
        const isUserIdError = 
          error.message?.includes('user_id') || 
          error.code === '42703' ||
          error.code === 'PGRST204' ||
          error.message?.includes("Could not find the 'user_id' column");
        
        if (isUserIdError) {
          // Coluna user_id não existe ainda - buscar todos os serviços
          const { data: allData, error: allError } = await supabase
            .from('services')
            .select('*')
            .order('name', { ascending: true });
          
          if (allError) throw allError;
          data = allData;
        } else {
          throw error;
        }
      }

      // Converter para formato Service
      const formattedServices: Service[] = (data || []).map((service: any) => ({
        id: service.id,
        name: service.name || service.title || '',
        duration: service.duration,
        price: typeof service.price === 'number' ? service.price : parseFloat(String(service.price)),
        description: service.description || '',
        icon: service.icon || 'scissors',
        image_url: service.image_url || null,
      }));

      setServices(formattedServices);
    } catch (error: any) {
      console.error('Erro ao buscar serviços:', error);
      notification.error('Erro ao carregar serviços');
      setServices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchServices();
    }
  }, [isOpen]);

  const handleEditService = (service: Service) => {
    // Converter duração de minutos para horas e minutos
    const hours = Math.floor(service.duration / 60);
    const minutes = service.duration % 60;
    
    setServiceForm({
      name: service.name,
      price: service.price,
      durationHours: hours,
      durationMinutes: minutes,
      description: service.description || '',
    });
    
    // Configurar imagem atual se existir
    const imageUrl = service.image_url || null;
    setCurrentImageUrl(imageUrl);
    setOriginalImageUrl(imageUrl); // Guardar imagem original para comparação
    setImagePreview(null);
    setSelectedImage(null);
    
    setEditingServiceId(service.id);
    setShowAddModal(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      notification.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notification.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setSelectedImage(file);
    
    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setCurrentImageUrl(null); // Limpar também a URL da imagem salva
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `services/${fileName}`;

      // Fazer upload para o bucket
      const { error: uploadError } = await supabase.storage
        .from('service-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Erro ao fazer upload:', uploadError);
        throw uploadError;
      }

      // Obter URL pública
      const { data } = supabase.storage
        .from('service-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }
  };

  const handleSaveService = async () => {
    // Validação
    if (!serviceForm.name.trim()) {
      notification.error('Nome do serviço é obrigatório');
      return;
    }

    if (!serviceForm.price || serviceForm.price <= 0) {
      notification.error('Preço deve ser maior que zero');
      return;
    }

    // Calcular duração total em minutos
    const totalMinutes = serviceForm.durationHours * 60 + serviceForm.durationMinutes;
    
    if (totalMinutes <= 0) {
      notification.error('Duração deve ser maior que zero');
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        notification.error('Usuário não autenticado');
        setIsUploading(false);
        return;
      }

      let imageUrl: string | null = null;

      // Se uma nova imagem foi selecionada, fazer upload
      if (selectedImage) {
        try {
          // Se estava editando e tinha imagem antiga, deletar a antiga
          if (editingServiceId && originalImageUrl) {
            try {
              // Extrair o caminho do arquivo da URL
              const urlParts = originalImageUrl.split('/service-images/');
              if (urlParts.length > 1) {
                const oldFilePath = `services/${urlParts[1]}`;
                await supabase.storage
                  .from('service-images')
                  .remove([oldFilePath]);
              }
            } catch (deleteError) {
              console.warn('Erro ao deletar imagem antiga:', deleteError);
              // Não bloquear o processo se falhar ao deletar
            }
          }

          imageUrl = await uploadImage(selectedImage);
        } catch (error: any) {
          notification.error('Erro ao fazer upload da imagem. Tente novamente.');
          setIsUploading(false);
          return;
        }
      } else if (editingServiceId && originalImageUrl && !currentImageUrl) {
        // Se está editando, tinha imagem original, mas agora currentImageUrl é null,
        // significa que o usuário removeu a imagem, então deletar e setar como null
        try {
          const urlParts = originalImageUrl.split('/service-images/');
          if (urlParts.length > 1) {
            const oldFilePath = `services/${urlParts[1]}`;
            await supabase.storage
              .from('service-images')
              .remove([oldFilePath]);
          }
        } catch (deleteError) {
          console.warn('Erro ao deletar imagem removida:', deleteError);
          // Não bloquear o processo se falhar ao deletar
        }
        imageUrl = null;
      } else if (currentImageUrl) {
        // Se há imagem atual (não foi removida), manter
        imageUrl = currentImageUrl;
      } else {
        // Caso padrão: null (sem imagem)
        imageUrl = null;
      }

      // Preparar dados do serviço
      // IMPORTANTE: title e name devem ser sempre preenchidos
      const serviceName = serviceForm.name.trim();
      const serviceData: any = {
        name: serviceName,
        title: serviceName, // Sempre preencher title (coluna pode existir)
        price: serviceForm.price,
        duration: totalMinutes,
        image_url: imageUrl,
        // NÃO adicionar user_id para que os serviços sejam públicos
        // user_id será NULL por padrão, permitindo que todos vejam
      };

      // Adicionar descrição (pode ser vazia)
      serviceData.description = serviceForm.description.trim() || null;

      // Se estiver editando, fazer UPDATE
      if (editingServiceId) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingServiceId);

        if (error) {
          // Tratar erros de title se necessário
          if (error.message?.includes('title') || error.code === '23502') {
            if (!serviceData.title) {
              serviceData.title = serviceData.name;
            }
            const retryResult = await supabase
              .from('services')
              .update(serviceData)
              .eq('id', editingServiceId);
            
            if (retryResult.error) {
              throw retryResult.error;
            }
          } else {
            throw error;
          }
        }

        notification.success('Serviço atualizado com sucesso');
        setEditingServiceId(null);
      } else {
        // Se não estiver editando, fazer INSERT
        let { error } = await supabase
          .from('services')
          .insert(serviceData);

        // Se der erro, tratar diferentes casos
        if (error) {
          const isUserIdError = 
            error.message?.includes('user_id') || 
            error.message?.includes("column") && error.message?.includes("user_id") ||
            error.code === '42703' ||
            error.code === 'PGRST204' ||
            error.message?.includes("Could not find the 'user_id' column");
          
          const isTitleError =
            error.message?.includes('title') ||
            error.code === '23502' && error.message?.includes('title');
          
          if (isUserIdError && !isTitleError) {
            // Remover user_id e tentar novamente (mantendo title)
            delete serviceData.user_id;
            const retryResult = await supabase
              .from('services')
              .insert(serviceData);
            
            if (retryResult.error) {
              throw retryResult.error;
            }
          } else if (isTitleError) {
            // Se title não existir, tentar sem ele (mas isso não deveria acontecer)
            // Se title existe mas está dando erro, garantir que está preenchido
            if (!serviceData.title) {
              serviceData.title = serviceData.name;
            }
            const retryResult = await supabase
              .from('services')
              .insert(serviceData);
            
            if (retryResult.error) {
              throw retryResult.error;
            }
          } else {
            // Outro tipo de erro, lançar normalmente
            throw error;
          }
        }

        notification.success('Serviço criado com sucesso');
      }

      // Limpar formulário
      setServiceForm({
        name: '',
        price: 0,
        durationMinutes: 30,
        durationHours: 0,
        description: '',
      });
      
      setSelectedImage(null);
      setImagePreview(null);
      setCurrentImageUrl(null);
      setOriginalImageUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setShowAddModal(false);
      fetchServices();
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error);
      notification.error(error.message || 'Erro ao salvar serviço');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    const confirmed = await confirm('Tem certeza que deseja excluir este serviço? Agendamentos futuros que usam este serviço não serão afetados, mas o serviço será removido da lista.');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      notification.success('Serviço excluído com sucesso');
      fetchServices();
    } catch (error: any) {
      console.error('Erro ao deletar serviço:', error);
      notification.error('Erro ao excluir serviço');
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}min`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}min`;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Gerenciar Serviços</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Adicione, edite ou remova os serviços oferecidos
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Botão Adicionar */}
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full mb-6 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Novo Serviço
              </button>

              {/* Lista de Serviços */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : services.length === 0 ? (
                <div className="text-center py-12 glass-card rounded-xl">
                  <Scissors className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Clique em "Novo Serviço" para adicionar um serviço
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map((service) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="glass-card rounded-xl p-4 flex items-center justify-between border border-border"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-white/5 flex-shrink-0 overflow-hidden">
                          {service.image_url ? (
                            <img 
                              src={service.image_url} 
                              alt={service.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Scissors className="w-6 h-6 text-primary/80" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-base mb-1">
                            {service.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span className="font-medium text-primary">
                                R$ {typeof service.price === 'number' 
                                  ? service.price.toFixed(2).replace('.', ',') 
                                  : parseFloat(String(service.price)).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatDuration(service.duration)}</span>
                            </div>
                          </div>
                          {service.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditService(service)}
                          className="p-2 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                          title="Editar serviço"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                          title="Excluir serviço"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Adicionar Serviço */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
            onClick={() => {
              setShowAddModal(false);
              setEditingServiceId(null);
              setServiceForm({
                name: '',
                price: 0,
                durationMinutes: 30,
                durationHours: 0,
                description: '',
              });
              setSelectedImage(null);
              setImagePreview(null);
              setCurrentImageUrl(null);
              setOriginalImageUrl(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-xl p-4 sm:p-6 w-full max-w-md border border-border max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">
                  {editingServiceId ? 'Editar Serviço' : 'Novo Serviço'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingServiceId(null);
                    setServiceForm({
                      name: '',
                      price: 0,
                      durationMinutes: 30,
                      durationHours: 0,
                      description: '',
                    });
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Nome do Serviço <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="Ex: Corte Social, Barba, etc."
                    className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Preço (R$) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={serviceForm.price || ''}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Duração <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-muted-foreground mb-1">Horas</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={serviceForm.durationHours}
                        onChange={(e) => setServiceForm({ 
                          ...serviceForm, 
                          durationHours: parseInt(e.target.value) || 0 
                        })}
                        className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-foreground"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-muted-foreground mb-1">Minutos</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={serviceForm.durationMinutes}
                        onChange={(e) => setServiceForm({ 
                          ...serviceForm, 
                          durationMinutes: parseInt(e.target.value) || 0 
                        })}
                        className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-foreground"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {formatDuration(serviceForm.durationHours * 60 + serviceForm.durationMinutes)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Descrição do serviço
                  </label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    placeholder="Ex: Corte clássico e elegante para o dia a dia"
                    rows={2}
                    className="w-full bg-background border border-border rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base text-foreground resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Opcional - Adicione uma descrição detalhada do serviço
                  </p>
                </div>

                {/* Upload de Imagem */}
                <div>
                  <label className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Foto do Serviço <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  
                  {/* Preview da imagem */}
                  {(imagePreview || currentImageUrl) && (
                    <div className="relative mb-3">
                      <div className="w-full h-32 sm:h-40 rounded-lg overflow-hidden border border-border bg-background flex items-center justify-center">
                        <img 
                          src={imagePreview || currentImageUrl || ''} 
                          alt="Preview"
                          className="max-w-full max-h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 p-1.5 sm:p-2 bg-destructive/80 hover:bg-destructive text-white rounded-full transition-colors"
                        title="Remover imagem"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  )}

                  {/* Input de arquivo */}
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                      id="service-image-upload"
                    />
                    <label
                      htmlFor="service-image-upload"
                      className="flex-1 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                      <span className="text-xs sm:text-sm text-foreground">
                        {imagePreview || currentImageUrl ? 'Trocar imagem' : 'Selecionar imagem'}
                      </span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos aceitos: JPG, PNG, WEBP, GIF. Tamanho máximo: 5MB
                  </p>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingServiceId(null);
                    setServiceForm({
                      name: '',
                      price: 0,
                      durationMinutes: 30,
                      durationHours: 0,
                      description: '',
                    });
              setSelectedImage(null);
              setImagePreview(null);
              setCurrentImageUrl(null);
              setOriginalImageUrl(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
                  }}
                  className="flex-1 bg-secondary text-secondary-foreground py-2 sm:py-2.5 rounded-lg font-medium text-sm sm:text-base"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveService}
                  disabled={isUploading}
                  className="flex-1 bg-primary text-primary-foreground py-2 sm:py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span className="hidden sm:inline">{selectedImage ? 'Enviando imagem...' : 'Salvando...'}</span>
                      <span className="sm:hidden">{selectedImage ? 'Enviando...' : 'Salvando...'}</span>
                    </>
                  ) : (
                    editingServiceId ? 'Atualizar' : 'Salvar'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
