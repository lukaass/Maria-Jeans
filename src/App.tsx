/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ShoppingCart, 
  Package, 
  History, 
  Settings, 
  LogOut, 
  Moon, 
  Sun, 
  User, 
  Trash2, 
  X,
  PlusCircle,
  MinusCircle,
  CheckCircle,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Category = 'Feminino' | 'Masculino' | 'Infantil';
type ProductType = 'Calça' | 'Bermuda' | 'Camisa' | 'Jaqueta' | 'Vestido' | 'Saia' | 'Outros';

interface Product {
  id: string;
  model: string;
  brand: string;
  category: Category;
  type: ProductType;
  size: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
}

interface SaleItem extends Product {
  quantity: number;
}

interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  date: Date;
}

interface UserProfile {
  name: string;
  photo: string | null;
  passwordHash: string;
}

const INITIAL_PASSWORD = 'admin';

export default function App() {
  // --- Global State ---
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('maria_jeans_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Maria',
      photo: null,
      passwordHash: INITIAL_PASSWORD,
    };
  });

  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'settings'>('inventory');
  const [inventoryFilter, setInventoryFilter] = useState<Category | 'Todos'>('Todos');

  // Profile Edit State
  const [profileForm, setProfileForm] = useState({
    name: userProfile.name,
    newPassword: '',
    confirmPassword: ''
  });

  // Inventory State
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('maria_jeans_products');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<{[key: string]: number}>({});
  const [modalCategory, setModalCategory] = useState<Category>('Feminino');
  const [modalType, setModalType] = useState<ProductType>('Calça');

  // Cart State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sales History
  const [salesHistory, setSalesHistory] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('maria_jeans_sales');
    return saved ? JSON.parse(saved).map((s: any) => ({ ...s, date: new Date(s.date) })) : [];
  });

  // Greeting & Motivation
  const [greeting, setGreeting] = useState('');
  const [motivationalMessage, setMotivationalMessage] = useState('');

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('maria_jeans_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('maria_jeans_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('maria_jeans_sales', JSON.stringify(salesHistory));
  }, [salesHistory]);

  // --- Greeting Logic ---
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Bom dia');
    else if (hour >= 12 && hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');

    const messages = [
      "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
      "Acredite em você e no seu potencial!",
      "Cada venda é um passo a mais rumo ao seu sonho.",
      "Sua dedicação é o que faz a Maria Jeans brilhar.",
      "Que seu dia seja tão incrível quanto você!",
      "Foco, força e muita fé no trabalho de hoje."
    ];
    setMotivationalMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, [isLoggedIn]);

  // --- Handlers ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPassword === userProfile.passwordHash) {
      setIsLoggedIn(true);
      setLoginPassword('');
    } else {
      alert('Senha incorreta!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveTab('inventory');
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct = { ...product, id: Math.random().toString(36).substr(2, 9) };
    setProducts([...products, newProduct]);
  };

  const addBulkProducts = (baseProduct: Omit<Product, 'id' | 'size' | 'stock'>, sizes: {[key: string]: number}) => {
    const newEntries: Product[] = Object.entries(sizes)
      .filter(([_, qty]) => qty > 0)
      .map(([size, qty]) => ({
        ...baseProduct,
        id: Math.random().toString(36).substr(2, 9),
        size,
        stock: qty
      }));
    
    setProducts([...products, ...newEntries]);
    setIsProductModalOpen(false);
    setSelectedSizes({});
  };

  const updateProduct = (product: Product) => {
    setProducts(products.map(p => p.id === product.id ? product : p));
    setIsProductModalOpen(false);
    setEditingProduct(null);
  };

  const deleteProduct = (id: string) => {
    if (confirm('Deseja excluir este produto?')) {
      setProducts(products.filter(p => p.id !== id));
      setCart(cart.filter(item => item.id !== id));
    }
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Produto sem estoque!');
      return;
    }
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert('Limite de estoque atingido no carrinho!');
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        const product = products.find(p => p.id === id);
        if (newQty > 0 && product && newQty <= product.stock) {
          return { ...item, quantity: newQty };
        }
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const finalizeSale = () => {
    if (cart.length === 0) return;
    const total = cart.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0);
    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      items: [...cart],
      total,
      date: new Date(),
    };
    const updatedProducts = products.map(p => {
      const cartItem = cart.find(item => item.id === p.id);
      if (cartItem) return { ...p, stock: p.stock - cartItem.quantity };
      return p;
    });
    setProducts(updatedProducts);
    setSalesHistory([newSale, ...salesHistory]);
    setCart([]);
    setIsCartOpen(false);
    alert('Venda realizada com sucesso!');
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (profileForm.newPassword) {
      if (profileForm.newPassword !== profileForm.confirmPassword) {
        alert('As senhas não coincidem!');
        return;
      }
      
      if (profileForm.newPassword.length < 4) {
        alert('A senha deve ter pelo menos 4 caracteres!');
        return;
      }
    }

    setUserProfile(prev => ({
      ...prev,
      name: profileForm.name,
      passwordHash: profileForm.newPassword || prev.passwordHash
    }));

    setProfileForm(prev => ({
      ...prev,
      newPassword: '',
      confirmPassword: ''
    }));

    alert('Perfil atualizado com sucesso!');
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = inventoryFilter === 'Todos' || p.category === inventoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Group products by type, then by model/brand/price
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const type = product.type;
    if (!acc[type]) acc[type] = {};
    
    // Unique key for a model "group"
    const modelKey = `${product.model}-${product.brand}-${product.sellPrice}-${product.category}`;
    
    if (!acc[type][modelKey]) {
      acc[type][modelKey] = {
        model: product.model,
        brand: product.brand,
        type: product.type,
        category: product.category,
        sellPrice: product.sellPrice,
        buyPrice: product.buyPrice, // Taking one as reference
        items: [] as Product[]
      };
    }
    acc[type][modelKey].items.push(product);
    return acc;
  }, {} as Record<string, Record<string, { 
    model: string, 
    brand: string, 
    type: ProductType, 
    category: Category, 
    sellPrice: number, 
    buyPrice: number,
    items: Product[] 
  }>>);

  const SIZE_GRIDS = {
    numeric: ['34', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58'],
    letters: ['PP', 'P', 'M', 'G', 'GG', 'XG', 'G1', 'G2', 'G3'],
    infantil: ['0-3m', '3-6m', '6-9m', '9-12m', '1', '2', '3', '4', '6', '8', '10', '12', '14', '16']
  };

  const PRODUCT_TYPES: ProductType[] = ['Calça', 'Bermuda', 'Camisa', 'Jaqueta', 'Vestido', 'Saia', 'Outros'];

  // --- Views ---

  // 1. Login View
  if (!isLoggedIn) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-4 transition-colors duration-500",
        isDarkMode ? "bg-jeans-dark text-white" : "bg-maria-light-pink text-gray-800"
      )}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className={cn(
            "w-full max-w-md p-8 rounded-3xl shadow-2xl border", 
            isDarkMode ? "bg-jeans-blue/20 border-jeans-blue/30" : "bg-white border-maria-pink/20"
          )}
        >
          <div className="flex flex-col items-center mb-8">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-lg", 
              isDarkMode ? "bg-jeans-blue text-white" : "bg-maria-pink text-white"
            )}>
              <ShoppingBag size={40} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Maria Jeans</h1>
            <p className="opacity-60">Gestão de Loja</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 opacity-70">Senha de Acesso</label>
              <input 
                type="password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)} 
                className={cn(
                  "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all", 
                  isDarkMode ? "bg-jeans-dark border-jeans-blue/50 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/30 focus:ring-maria-pink"
                )} 
                placeholder="••••••••" 
                required 
              />
            </div>
            <button 
              type="submit" 
              className={cn(
                "w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95", 
                isDarkMode ? "bg-jeans-blue hover:bg-jeans-blue/80" : "bg-maria-pink hover:bg-maria-pink/80"
              )}
            >
              Entrar
            </button>
          </form>
          <div className="mt-8 flex justify-center">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-black/5 transition-colors">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 2. Main App View
  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-500", 
      isDarkMode ? "bg-jeans-dark text-white" : "bg-maria-light-pink text-gray-800"
    )}>
      {/* Header */}
      <header className={cn(
        "p-4 md:p-6 flex items-center justify-between border-b sticky top-0 z-30 backdrop-blur-md transition-all", 
        isDarkMode ? "bg-jeans-dark/80 border-jeans-blue/20" : "bg-white/80 border-maria-pink/10"
      )}>
        <div className="flex items-center gap-3 md:gap-4">
          <div className={cn(
            "w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border-2 shadow-sm flex-shrink-0", 
            isDarkMode ? "border-jeans-blue" : "border-maria-pink"
          )}>
            {userProfile.photo ? (
              <img src={userProfile.photo} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className={cn("w-full h-full flex items-center justify-center", isDarkMode ? "bg-jeans-blue" : "bg-maria-pink text-white")}>
                <User size={20} className="md:hidden" />
                <User size={24} className="hidden md:block" />
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <h2 className="font-bold text-lg leading-tight">{greeting}, {userProfile.name}!</h2>
            <p className="text-xs opacity-60 italic truncate max-w-[300px]">"{motivationalMessage}"</p>
          </div>
          <div className="md:hidden">
            <h2 className="font-bold text-base leading-tight">Maria Jeans</h2>
            <p className="text-[10px] opacity-60 uppercase tracking-widest font-bold">Gestão</p>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={() => setIsCartOpen(true)} 
            className={cn(
              "relative p-3 rounded-xl transition-all hover:scale-105 active:scale-90", 
              isDarkMode ? "bg-jeans-blue text-white" : "bg-maria-pink text-white"
            )}
          >
            <ShoppingCart size={20} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-xl hover:bg-black/5 transition-colors hidden md:block">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={handleLogout} className="p-3 rounded-xl hover:bg-red-50 text-red-500 transition-colors active:scale-90">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Greeting Section */}
      <div className="md:hidden px-4 pt-6">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-5 rounded-3xl border shadow-sm",
            isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/20" : "bg-white border-maria-pink/10"
          )}
        >
          <h2 className="font-bold text-xl mb-1">{greeting}, {userProfile.name}!</h2>
          <p className="text-sm opacity-70 italic leading-relaxed">"{motivationalMessage}"</p>
        </motion.div>
      </div>

      {/* Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'inventory' && (
            <motion.div 
              key="inventory" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Package className="text-maria-pink" /> Estoque
                </h1>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" size={18} />
                    <input 
                      type="text" 
                      placeholder="Buscar..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className={cn(
                        "w-full pl-10 pr-4 py-3 md:py-2 rounded-xl border focus:outline-none focus:ring-2 transition-all", 
                        isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-white border-maria-pink/20 focus:ring-maria-pink"
                      )} 
                    />
                  </div>
                  <button 
                    onClick={() => { 
                      setEditingProduct(null); 
                      setModalCategory('Feminino');
                      setModalType('Calça');
                      setSelectedSizes({});
                      setIsProductModalOpen(true); 
                    }} 
                    className={cn(
                      "p-3 md:px-4 md:py-2 rounded-xl font-bold text-white flex items-center gap-2 shadow-md transition-all active:scale-90", 
                      isDarkMode ? "bg-jeans-blue" : "bg-maria-pink"
                    )}
                  >
                    <Plus size={24} className="md:w-5 md:h-5" /> <span className="hidden md:inline">Novo Produto</span>
                  </button>
                </div>
              </div>

              {/* Category Quick Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar flex-nowrap">
                {['Todos', 'Feminino', 'Masculino', 'Infantil'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setInventoryFilter(cat as any)}
                    className={cn(
                      "px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border",
                      inventoryFilter === cat 
                        ? (isDarkMode ? "bg-jeans-blue border-jeans-blue text-white" : "bg-maria-pink border-maria-pink text-white")
                        : (isDarkMode ? "bg-jeans-blue/5 border-jeans-blue/20 opacity-60" : "bg-white border-maria-pink/10 opacity-60")
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-10">
                {Object.entries(groupedProducts).length > 0 ? (
                  Object.entries(groupedProducts).sort().map(([type, modelGroups]) => (
                    <div key={type} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-px flex-1", isDarkMode ? "bg-jeans-blue/20" : "bg-maria-pink/10")} />
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] opacity-40">
                          {type}s ({Object.values(modelGroups).length} modelos)
                        </h2>
                        <div className={cn("h-px flex-1", isDarkMode ? "bg-jeans-blue/20" : "bg-maria-pink/10")} />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {Object.values(modelGroups).map((group, gIdx) => (
                          <motion.div 
                            layout 
                            key={gIdx} 
                            className={cn(
                              "p-5 rounded-2xl border shadow-sm group relative overflow-hidden flex flex-col", 
                              isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/20" : "bg-white border-maria-pink/10"
                            )}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full", 
                                group.category === 'Feminino' ? "bg-pink-100 text-pink-600" : 
                                group.category === 'Masculino' ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
                              )}>
                                {group.category}
                              </span>
                            </div>
                            
                            <h3 className="font-bold text-lg mb-0.5 truncate">{group.model}</h3>
                            <p className="text-xs opacity-50 mb-4 font-medium">{group.brand}</p>
                            
                            <div className="flex-1">
                              <p className="text-[10px] opacity-50 uppercase font-bold mb-2">Tamanhos Disponíveis</p>
                              <div className="flex flex-wrap gap-1.5 mb-6">
                                {group.items.sort((a, b) => a.size.localeCompare(b.size, undefined, {numeric: true})).map(item => (
                                  <button
                                    key={item.id}
                                    onClick={() => addToCart(item)}
                                    className={cn(
                                      "px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-90 flex flex-col items-center min-w-[40px]",
                                      item.stock > 0 
                                        ? (isDarkMode ? "bg-jeans-blue/20 border-jeans-blue/40 hover:bg-jeans-blue" : "bg-maria-pink/5 border-maria-pink/20 hover:bg-maria-pink/10 text-maria-pink")
                                        : "opacity-30 cursor-not-allowed grayscale"
                                    )}
                                    title={`Estoque: ${item.stock}`}
                                  >
                                    <span>{item.size}</span>
                                    <span className="text-[8px] opacity-60 font-normal">{item.stock}un</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-dashed border-black/5 mt-auto">
                              <div>
                                <p className="text-[10px] opacity-50 uppercase font-bold">Preço</p>
                                <p className="text-xl font-black text-maria-pink">R$ {group.sellPrice.toFixed(2)}</p>
                              </div>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => { 
                                    // Edit the first item as a proxy for the group, or we might need a better edit flow
                                    setEditingProduct(group.items[0]); 
                                    setModalCategory(group.category);
                                    setModalType(group.type);
                                    setIsProductModalOpen(true); 
                                  }} 
                                  className="p-2 rounded-xl bg-black/5 hover:bg-black/10 transition-colors"
                                >
                                  <Settings size={16} />
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center opacity-40">
                    <Package size={48} className="mx-auto mb-4" />
                    <p>Nenhum produto encontrado nesta categoria.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="space-y-6"
            >
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <History className="text-maria-pink" /> Histórico de Vendas
              </h1>
              <div className="space-y-4">
                {salesHistory.map(sale => (
                  <div key={sale.id} className={cn("p-6 rounded-2xl border shadow-sm", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/20" : "bg-white border-maria-pink/10")}>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="text-xs opacity-50">ID: {sale.id}</p>
                        <p className="font-bold">{format(sale.date, "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-50 uppercase font-bold">Total</p>
                        <p className="text-2xl font-black text-maria-pink">R$ {sale.total.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.model} ({item.size})</span>
                          <span className="opacity-60">R$ {(item.sellPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {salesHistory.length === 0 && (
                  <div className="py-20 text-center opacity-40">
                    <History size={48} className="mx-auto mb-4" />
                    <p>Nenhuma venda registrada.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="max-w-2xl mx-auto space-y-8"
            >
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="text-maria-pink" /> Configurações
              </h1>
              <div className={cn("p-8 rounded-3xl border shadow-sm space-y-8", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/20" : "bg-white border-maria-pink/10")}>
                <div className="flex flex-col items-center gap-4">
                  <div className={cn("w-32 h-32 rounded-full overflow-hidden border-4 shadow-xl relative group", isDarkMode ? "border-jeans-blue" : "border-maria-pink")}>
                    {userProfile.photo ? (
                      <img src={userProfile.photo} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className={cn("w-full h-full flex items-center justify-center", isDarkMode ? "bg-jeans-blue" : "bg-maria-pink text-white")}>
                        <User size={48} />
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                      <Plus className="text-white" />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => { 
                          const file = e.target.files?.[0]; 
                          if (file) { 
                            const reader = new FileReader(); 
                            reader.onloadend = () => { setUserProfile({ ...userProfile, photo: reader.result as string }); }; 
                            reader.readAsDataURL(file); 
                          } 
                        }} 
                      />
                    </label>
                  </div>
                  <p className="text-sm opacity-60">Alterar foto de perfil</p>
                </div>
                
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 opacity-70">Nome de Usuário</label>
                      <input 
                        type="text" 
                        value={profileForm.name} 
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} 
                        className={cn("w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2", isDarkMode ? "bg-jeans-dark border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")} 
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-dashed border-black/10">
                      <div className="col-span-full">
                        <p className="text-xs font-bold opacity-40 uppercase tracking-widest mb-2">Segurança</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 opacity-70">Nova Senha</label>
                        <input 
                          type="password" 
                          placeholder="Digite a nova senha" 
                          value={profileForm.newPassword}
                          onChange={(e) => setProfileForm({ ...profileForm, newPassword: e.target.value })}
                          className={cn("w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2", isDarkMode ? "bg-jeans-dark border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")} 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2 opacity-70">Confirmar Senha</label>
                        <input 
                          type="password" 
                          placeholder="Repita a nova senha" 
                          value={profileForm.confirmPassword}
                          onChange={(e) => setProfileForm({ ...profileForm, confirmPassword: e.target.value })}
                          className={cn("w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2", isDarkMode ? "bg-jeans-dark border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")} 
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2",
                      isDarkMode ? "bg-jeans-blue" : "bg-maria-pink"
                    )}
                  >
                    <CheckCircle size={20} /> Salvar Alterações
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Nav */}
      <nav className={cn("p-2 border-t fixed bottom-0 left-0 right-0 z-30 flex justify-around items-center backdrop-blur-md", isDarkMode ? "bg-jeans-dark/80 border-jeans-blue/20" : "bg-white/80 border-maria-pink/10")}>
        <NavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={24} />} label="Estoque" isDarkMode={isDarkMode} />
        <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={24} />} label="Vendas" isDarkMode={isDarkMode} />
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={24} />} label="Perfil" isDarkMode={isDarkMode} />
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProductModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className={cn("relative w-full max-w-lg p-8 rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]", isDarkMode ? "bg-jeans-dark text-white" : "bg-white text-gray-800")}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                <button onClick={() => setIsProductModalOpen(false)}><X size={24} /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const baseData = {
                  model: formData.get('model') as string,
                  brand: formData.get('brand') as string,
                  category: formData.get('category') as Category,
                  type: formData.get('type') as ProductType,
                  buyPrice: Number(formData.get('buyPrice')),
                  sellPrice: Number(formData.get('sellPrice')),
                };

                if (editingProduct) {
                  updateProduct({ 
                    ...baseData, 
                    id: editingProduct.id, 
                    size: formData.get('size') as string,
                    stock: Number(formData.get('stock'))
                  });
                } else {
                  addBulkProducts(baseData, selectedSizes);
                }
              }} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold opacity-50 uppercase">Modelo / Nome do Produto</label>
                    <input 
                      name="model" 
                      list="model-suggestions"
                      defaultValue={editingProduct?.model} 
                      required 
                      className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")} 
                      placeholder="Ex: Skinny High Waist" 
                    />
                    <datalist id="model-suggestions">
                      {Array.from(new Set(products.map(p => p.model))).map(m => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase">Marca</label>
                    <input name="brand" defaultValue={editingProduct?.brand} required className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")} placeholder="Ex: Maria Jeans" />
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase">Tipo de Peça</label>
                    <select 
                      name="type" 
                      value={modalType}
                      onChange={(e) => setModalType(e.target.value as ProductType)}
                      className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")}
                    >
                      {PRODUCT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase">Categoria</label>
                    <select 
                      name="category" 
                      value={modalCategory}
                      onChange={(e) => setModalCategory(e.target.value as Category)}
                      className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")}
                    >
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Infantil">Infantil</option>
                    </select>
                  </div>
                  
                  {editingProduct ? (
                    <>
                      <div>
                        <label className="text-xs font-bold opacity-50 uppercase">Tamanho</label>
                        <input name="size" defaultValue={editingProduct.size} required className={cn("w-full px-4 py-3 rounded-xl border", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30" : "bg-gray-50 border-maria-pink/20")} />
                      </div>
                      <div>
                        <label className="text-xs font-bold opacity-50 uppercase">Estoque</label>
                        <input name="stock" type="number" defaultValue={editingProduct.stock} required className={cn("w-full px-4 py-3 rounded-xl border", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30" : "bg-gray-50 border-maria-pink/20")} />
                      </div>
                    </>
                  ) : null}

                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase">Preço Compra (R$)</label>
                    <input name="buyPrice" type="number" step="0.01" defaultValue={editingProduct?.buyPrice} required className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")} />
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase">Preço Venda (R$)</label>
                    <input name="sellPrice" type="number" step="0.01" defaultValue={editingProduct?.sellPrice} required className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")} />
                  </div>
                </div>

                {!editingProduct && (
                  <div className="space-y-4 pt-4 border-t border-dashed border-black/10">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Grade de Tamanhos & Quantidade</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setSelectedSizes({})} className="text-[10px] underline opacity-50">Limpar</button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {/* Logic to determine which grid to show */}
                      {(() => {
                        let grid: string[] = [];
                        if (modalCategory === 'Infantil') grid = SIZE_GRIDS.infantil;
                        else if (['Calça', 'Bermuda', 'Saia'].includes(modalType)) grid = SIZE_GRIDS.numeric;
                        else grid = SIZE_GRIDS.letters;

                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {grid.map(size => (
                              <div key={size} className={cn(
                                "flex items-center gap-2 p-2 rounded-xl border transition-all",
                                selectedSizes[size] !== undefined ? (isDarkMode ? "bg-jeans-blue/20 border-jeans-blue" : "bg-maria-pink/5 border-maria-pink") : "opacity-60 border-transparent"
                              )}>
                                <input 
                                  type="checkbox" 
                                  checked={selectedSizes[size] !== undefined}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedSizes({...selectedSizes, [size]: 0});
                                    else {
                                      const next = {...selectedSizes};
                                      delete next[size];
                                      setSelectedSizes(next);
                                    }
                                  }}
                                  className="w-4 h-4 rounded accent-maria-pink"
                                />
                                <span className="text-xs font-bold w-8">{size}</span>
                                {selectedSizes[size] !== undefined && (
                                  <input 
                                    type="number" 
                                    placeholder="Qtd"
                                    value={selectedSizes[size] || ''}
                                    onChange={(e) => setSelectedSizes({...selectedSizes, [size]: Number(e.target.value)})}
                                    className={cn("w-full px-2 py-1 text-xs rounded-lg border", isDarkMode ? "bg-jeans-dark border-jeans-blue/30" : "bg-white border-maria-pink/20")}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                <button type="submit" className={cn("w-full py-4 rounded-2xl font-bold text-white shadow-lg", isDarkMode ? "bg-jeans-blue" : "bg-maria-pink")}>
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Lote de Produtos'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end md:p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCartOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className={cn("relative w-full md:max-w-md h-[90vh] md:h-full p-6 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col", isDarkMode ? "bg-jeans-dark text-white" : "bg-white text-gray-800")}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <ShoppingCart className="text-maria-pink" /> Carrinho
                </h2>
                <button onClick={() => setIsCartOpen(false)}><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4">
                {cart.map(item => (
                  <div key={item.id} className={cn("p-4 rounded-2xl border flex items-center gap-4", isDarkMode ? "bg-jeans-blue/5 border-jeans-blue/20" : "bg-gray-50 border-maria-pink/10")}>
                    <div className="flex-1">
                      <h4 className="font-bold">{item.model}</h4>
                      <p className="text-xs opacity-60">R$ {item.sellPrice.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 hover:bg-black/5 rounded-full"><MinusCircle size={20} /></button>
                      <span className="font-bold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 hover:bg-black/5 rounded-full"><PlusCircle size={20} /></button>
                      <button onClick={() => removeFromCart(item.id)} className="ml-2 p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <ShoppingCart size={64} className="mb-4" />
                    <p>Carrinho vazio.</p>
                  </div>
                )}
              </div>
              <div className="mt-6 pt-6 border-t space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg opacity-60">Total</span>
                  <span className="text-3xl font-black text-maria-pink">
                    R$ {cart.reduce((acc, item) => acc + (item.sellPrice * item.quantity), 0).toFixed(2)}
                  </span>
                </div>
                <button 
                  disabled={cart.length === 0} 
                  onClick={finalizeSale} 
                  className={cn(
                    "w-full py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50", 
                    isDarkMode ? "bg-jeans-blue" : "bg-maria-pink"
                  )}
                >
                  Finalizar Venda
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, isDarkMode }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isDarkMode: boolean }) {
  return (
    <button 
      onClick={onClick} 
      className={cn(
        "flex flex-col items-center gap-1.5 px-6 py-2.5 rounded-2xl transition-all active:scale-90", 
        active ? (isDarkMode ? "text-white bg-jeans-blue/20" : "text-maria-pink bg-maria-pink/10") : "opacity-40 hover:opacity-100"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  );
}
