import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Clock, DollarSign, Scissors, Edit } from 'lucide-react';
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
    
    setEditingServiceId(service.id);
    setShowAddModal(true);
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

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        notification.error('Usuário não autenticado');
        return;
      }

      // Preparar dados do serviço
      // IMPORTANTE: title e name devem ser sempre preenchidos
      const serviceName = serviceForm.name.trim();
      const serviceData: any = {
        name: serviceName,
        title: serviceName, // Sempre preencher title (coluna pode existir)
        price: serviceForm.price,
        duration: totalMinutes,
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
      
      setShowAddModal(false);
      fetchServices();
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error);
      notification.error(error.message || 'Erro ao salvar serviço');
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
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-white/5 flex-shrink-0">
                          <Scissors className="w-6 h-6 text-primary/80" />
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
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card rounded-xl p-6 w-full max-w-md border border-border"
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

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Nome do Serviço <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="Ex: Corte Social, Barba, etc."
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Preço (R$) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={serviceForm.price || ''}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
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
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
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
                        className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: {formatDuration(serviceForm.durationHours * 60 + serviceForm.durationMinutes)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Descrição do serviço
                  </label>
                  <textarea
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    placeholder="Ex: Corte clássico e elegante para o dia a dia"
                    rows={3}
                    className="w-full bg-background border border-border rounded-lg px-4 py-2 text-foreground resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Opcional - Adicione uma descrição detalhada do serviço
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
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
                  className="flex-1 bg-secondary text-secondary-foreground py-2 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveService}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg font-medium"
                >
                  {editingServiceId ? 'Atualizar Serviço' : 'Salvar Serviço'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
