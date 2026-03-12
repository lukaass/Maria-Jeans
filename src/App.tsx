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
  ShoppingBag,
  Download,
  Upload,
  Sparkles,
  RefreshCw,
  Lightbulb,
  ChevronRight,
  ArrowLeft,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Category = string;
type ProductType = string;
type Brand = string;

interface Product {
  id: string;
  model: string;
  brand: Brand;
  category: Category;
  type: ProductType;
  size: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  isActive?: boolean;
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

  const [activeTab, setActiveTab] = useState<'inventory' | 'history' | 'settings' | 'marketing'>('inventory');
  const [inventoryFilter, setInventoryFilter] = useState<Category | 'Todos'>('Todos');
  const [brandFilter, setBrandFilter] = useState<Brand | 'Todas'>('Todas');

  // Cloud Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Categories & Brands State
  const [categories, setCategories] = useState<Category[]>(['Feminino', 'Masculino', 'Infantil', 'Unissex', 'Acessórios']);
  const [brands, setBrands] = useState<Brand[]>(['Maria Jeans', 'Sawary', 'Pit Bull', 'Consciência', 'Outras']);

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
  const [selectedGridType, setSelectedGridType] = useState<'numeric' | 'letters' | 'infantil'>('numeric');
  const [modalBuyPrice, setModalBuyPrice] = useState<number>(0);
  const [modalSellPrice, setModalSellPrice] = useState<number>(0);

  // Cart State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isStockAlertOpen, setIsStockAlertOpen] = useState(false);
  const [stockAlertProduct, setStockAlertProduct] = useState<Product | null>(null);

  // Sales History
  const [salesHistory, setSalesHistory] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('maria_jeans_sales');
    return saved ? JSON.parse(saved).map((s: any) => ({ ...s, date: new Date(s.date) })) : [];
  });

  // Greeting & Motivation
  const [greeting, setGreeting] = useState('');
  const [motivationalMessage, setMotivationalMessage] = useState('');

  // Marketing AI State
  const [marketingChallenge, setMarketingChallenge] = useState<{
    challenge: string;
    script: string;
    image?: string;
    date?: string;
  } | null>(() => {
    const saved = localStorage.getItem('maria_jeans_marketing');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === format(new Date(), 'yyyy-MM-dd')) return parsed;
    }
    return null;
  });
  const [isGeneratingMarketing, setIsGeneratingMarketing] = useState(false);

  // --- Persistence & Cloud Sync ---
  const fetchData = async () => {
    setIsSyncing(true);
    try {
      const [pRes, sRes, prRes, cRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/sales'),
        fetch('/api/profile'),
        fetch('/api/config')
      ]);
      
      if (pRes.ok) setProducts(await pRes.json());
      if (sRes.ok) {
        const sales = await sRes.json();
        setSalesHistory(sales.map((s: any) => ({ ...s, date: new Date(s.date) })));
      }
      if (prRes.ok) {
        const profile = await prRes.json();
        setUserProfile(profile);
        setProfileForm(prev => ({ ...prev, name: profile.name }));
      }
      if (cRes.ok) {
        const config = await cRes.json();
        setCategories(config.categories);
        setBrands(config.brands);
      }
      setLastSync(new Date());
    } catch (error) {
      console.error("Erro ao sincronizar dados:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const saveData = async (type: 'products' | 'sales' | 'profile' | 'config', data: any) => {
    setIsSyncing(true);
    try {
      await fetch(`/api/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      setLastSync(new Date());
    } catch (error) {
      console.error(`Erro ao salvar ${type}:`, error);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isLoggedIn) saveData('profile', userProfile);
    localStorage.setItem('maria_jeans_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    if (isLoggedIn) saveData('products', products);
    localStorage.setItem('maria_jeans_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    if (isLoggedIn) saveData('sales', salesHistory);
    localStorage.setItem('maria_jeans_sales', JSON.stringify(salesHistory));
  }, [salesHistory]);

  useEffect(() => {
    if (isLoggedIn) saveData('config', { categories, brands });
  }, [categories, brands]);

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

  useEffect(() => {
    if (isProductModalOpen) {
      if (editingProduct) {
        setModalBuyPrice(editingProduct.buyPrice);
        setModalSellPrice(editingProduct.sellPrice);
      } else {
        setModalBuyPrice(0);
        setModalSellPrice(0);
      }
    }
  }, [isProductModalOpen, editingProduct]);

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

  const handleQuickStockChange = (id: string, delta: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;

    const newStock = Math.max(0, product.stock + delta);
    
    if (product.stock === 1 && newStock === 0) {
      setStockAlertProduct(product);
      setIsStockAlertOpen(true);
    }

    const updatedProducts = products.map(p => p.id === id ? { ...p, stock: newStock } : p);
    
    const modelKey = `${product.model}-${product.brand}-${product.sellPrice}-${product.category}`;
    const modelItems = updatedProducts.filter(p => 
      `${p.model}-${p.brand}-${p.sellPrice}-${p.category}` === modelKey
    );
    
    const allZero = modelItems.every(item => item.stock === 0);
    
    if (allZero && modelItems.length > 0) {
      if (confirm(`Todos os tamanhos do modelo ${product.model} estão zerados. Deseja excluir este cadastro por completo?`)) {
        setProducts(prev => prev.filter(p => `${p.model}-${p.brand}-${p.sellPrice}-${p.category}` !== modelKey));
        setCart(prev => prev.filter(item => `${item.model}-${item.brand}-${item.sellPrice}-${item.category}` !== modelKey));
        return;
      }
    }

    setProducts(updatedProducts);
  };

  const deleteProduct = (id: string) => {
    if (confirm('Deseja excluir este produto?')) {
      setProducts(products.filter(p => p.id !== id));
      setCart(cart.filter(item => item.id !== id));
    }
  };

  const addToCart = (product: Product) => {
    if (product.isActive === false) {
      alert('Este produto está desativado e não pode ser vendido.');
      return;
    }
    if (product.stock <= 0) {
      setStockAlertProduct(product);
      setIsStockAlertOpen(true);
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

  const generateMarketingChallenge = async () => {
    setIsGeneratingMarketing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // 1. Generate Text Challenge
      const textResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Você é um especialista em marketing para a loja 'Maria Jeans'. 
        O estoque atual tem produtos como: ${products.slice(0, 10).map(p => `${p.model} (${p.brand})`).join(', ')}.
        Hoje é ${format(new Date(), "EEEE", { locale: ptBR })}.
        Sugira um desafio de marketing diário para a dona Maria postar no Instagram/WhatsApp.
        O desafio deve ser prático e direto.
        Retorne APENAS um JSON no formato: {"challenge": "descrição curta do desafio", "script": "legenda sugerida para o post"}`,
        config: { responseMimeType: "application/json" }
      });

      const data = JSON.parse(textResponse.text || '{}');
      
      // 2. Generate Reference Image
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `A professional, high-quality aesthetic social media photo for a clothing store called Maria Jeans. The photo should show: ${data.challenge}. Lifestyle photography, bright lighting, trendy.` }]
        },
        config: {
          imageConfig: { aspectRatio: "1:1" }
        }
      });

      let imageUrl = '';
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      const newChallenge = {
        ...data,
        image: imageUrl,
        date: format(new Date(), 'yyyy-MM-dd')
      };

      setMarketingChallenge(newChallenge);
      localStorage.setItem('maria_jeans_marketing', JSON.stringify(newChallenge));
    } catch (error) {
      console.error("Erro ao gerar marketing:", error);
      alert("Não consegui gerar a ideia agora. Tente novamente em instantes.");
    } finally {
      setIsGeneratingMarketing(false);
    }
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

  const handleExportBackup = () => {
    const backupData = {
      products,
      salesHistory,
      userProfile,
      categories,
      brands,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_maria_jeans_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: Isso irá substituir todos os dados atuais (estoque, vendas, etc) pelos dados deste arquivo de backup. Deseja continuar?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.products) setProducts(data.products);
        if (data.salesHistory) setSalesHistory(data.salesHistory.map((s: any) => ({ ...s, date: new Date(s.date) })));
        if (data.userProfile) setUserProfile(data.userProfile);
        if (data.categories) setCategories(data.categories);
        if (data.brands) setBrands(data.brands);
        alert('Backup restaurado com sucesso! Os dados serão sincronizados com a nuvem automaticamente.');
      } catch (err) {
        alert('Erro ao ler o arquivo de backup. Verifique se o arquivo é válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = inventoryFilter === 'Todos' || p.category === inventoryFilter;
    const matchesBrand = brandFilter === 'Todas' || p.brand === brandFilter;
    
    return matchesSearch && matchesCategory && matchesBrand;
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

  const DEFAULT_PRODUCT_TYPES = ['Calça', 'Bermuda', 'Shorts', 'Camisa', 'Jaqueta', 'Vestido', 'Saia'];
  const allProductTypes = Array.from(new Set([...DEFAULT_PRODUCT_TYPES, ...products.map(p => p.type)]));

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
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg leading-tight">{greeting}, {userProfile.name}!</h2>
              {isSyncing ? (
                <div className="flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full animate-pulse">
                  <div className="w-1 h-1 bg-blue-500 rounded-full" /> Sincronizando...
                </div>
              ) : lastSync && (
                <div className="text-[10px] opacity-40">
                  Sincronizado {format(lastSync, 'HH:mm')}
                </div>
              )}
            </div>
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
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-xl hover:bg-black/5 transition-colors">
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
              <div className="space-y-3">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar flex-nowrap">
                  {['Todos', ...categories].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setInventoryFilter(cat as any)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                        inventoryFilter === cat 
                          ? (isDarkMode ? "bg-jeans-blue border-jeans-blue text-white" : "bg-maria-pink border-maria-pink text-white")
                          : (isDarkMode ? "bg-jeans-blue/5 border-jeans-blue/20 opacity-60" : "bg-white border-maria-pink/10 opacity-60")
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar flex-nowrap">
                  {['Todas', ...brands].map((brand) => (
                    <button
                      key={brand}
                      onClick={() => setBrandFilter(brand as any)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                        brandFilter === brand 
                          ? (isDarkMode ? "bg-jeans-blue border-jeans-blue text-white" : "bg-maria-pink border-maria-pink text-white")
                          : (isDarkMode ? "bg-jeans-blue/5 border-jeans-blue/20 opacity-60" : "bg-white border-maria-pink/10 opacity-60")
                      )}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
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
                              isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/20" : "bg-white border-maria-pink/10",
                              group.items.every(i => i.isActive === false) && "opacity-60 grayscale-[0.5]"
                            )}
                          >
                            {group.items.every(i => i.isActive === false) && (
                              <div className="absolute top-2 right-2 z-10">
                                <span className="bg-gray-500 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase">Inativo</span>
                              </div>
                            )}
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
                              <div className="flex flex-wrap gap-2 mb-6">
                                {group.items.sort((a, b) => a.size.localeCompare(b.size, undefined, {numeric: true})).map(item => (
                                  <div 
                                    key={item.id}
                                    className={cn(
                                      "flex flex-col items-center border rounded-xl p-1.5 min-w-[65px] transition-all",
                                      item.stock > 0 && item.isActive !== false
                                        ? (isDarkMode ? "bg-jeans-blue/5 border-jeans-blue/20" : "bg-white border-maria-pink/10")
                                        : "opacity-40 bg-gray-50 grayscale"
                                    )}
                                  >
                                    <button 
                                      onClick={() => {
                                        if (item.isActive === false) return;
                                        addToCart(item);
                                      }}
                                      className="w-full text-center mb-1.5 group/size"
                                      title="Clique para adicionar ao carrinho"
                                    >
                                      <span className="text-xs font-black group-hover/size:text-maria-pink transition-colors">{item.size}</span>
                                    </button>
                                    
                                    <div className="flex items-center justify-between w-full px-1">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleQuickStockChange(item.id, -1); }}
                                        className="text-red-500 hover:scale-125 transition-transform"
                                      >
                                        <MinusCircle size={14} />
                                      </button>
                                      
                                      <span className="text-[10px] font-bold tabular-nums">{item.stock}</span>

                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleQuickStockChange(item.id, 1); }}
                                        className="text-green-500 hover:scale-125 transition-transform"
                                      >
                                        <PlusCircle size={14} />
                                      </button>
                                    </div>
                                  </div>
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
                                    setEditingProduct(group.items[0]); 
                                    setModalCategory(group.category);
                                    setModalType(group.type);
                                    setIsProductModalOpen(true); 
                                  }} 
                                  className="p-2 rounded-xl bg-black/5 hover:bg-black/10 transition-colors"
                                  title="Configurações"
                                >
                                  <Settings size={16} />
                                </button>
                                <button 
                                  onClick={() => {
                                    const idsToToggle = group.items.map(i => i.id);
                                    const allActive = group.items.every(i => i.isActive !== false);
                                    setProducts(products.map(p => idsToToggle.includes(p.id) ? { ...p, isActive: !allActive } : p));
                                  }} 
                                  className={cn(
                                    "p-2 rounded-xl transition-colors",
                                    group.items.every(i => i.isActive !== false) 
                                      ? "bg-green-50 text-green-500 hover:bg-green-100" 
                                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                  )}
                                  title={group.items.every(i => i.isActive !== false) ? "Desativar Modelo" : "Ativar Modelo"}
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm(`Deseja excluir permanentemente o modelo ${group.model} e todos os seus tamanhos do sistema?`)) {
                                      const modelKey = `${group.model}-${group.brand}-${group.sellPrice}-${group.category}`;
                                      setProducts(prev => prev.filter(p => `${p.model}-${p.brand}-${p.sellPrice}-${p.category}` !== modelKey));
                                      setCart(prev => prev.filter(item => `${item.model}-${item.brand}-${item.sellPrice}-${item.category}` !== modelKey));
                                    }
                                  }} 
                                  className="p-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                  title="Excluir Modelo Completamente"
                                >
                                  <Trash2 size={16} />
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

          {activeTab === 'marketing' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-24">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-bold">Assistente de Marketing</h2>
                  <p className="text-sm opacity-60">Sua meta diária para brilhar nas redes sociais.</p>
                </div>
                <div className={cn("p-3 rounded-2xl", isDarkMode ? "bg-jeans-blue/20 text-jeans-blue" : "bg-maria-pink/10 text-maria-pink")}>
                  <Sparkles size={24} />
                </div>
              </div>

              {!marketingChallenge && !isGeneratingMarketing ? (
                <div className={cn("p-8 rounded-3xl border-2 border-dashed flex flex-col items-center text-center space-y-4", isDarkMode ? "border-jeans-blue/20" : "border-maria-pink/20")}>
                  <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", isDarkMode ? "bg-jeans-blue/10" : "bg-maria-pink/5")}>
                    <Lightbulb size={32} className={isDarkMode ? "text-jeans-blue" : "text-maria-pink"} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Pronta para o desafio de hoje?</h3>
                    <p className="text-sm opacity-60 max-w-xs mx-auto">Nossa IA vai analisar seu estoque e sugerir a melhor forma de divulgar seus produtos hoje.</p>
                  </div>
                  <button 
                    onClick={generateMarketingChallenge}
                    className={cn(
                      "px-8 py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-2",
                      isDarkMode ? "bg-jeans-blue" : "bg-maria-pink"
                    )}
                  >
                    Gerar Meta de Hoje
                  </button>
                </div>
              ) : isGeneratingMarketing ? (
                <div className={cn("p-12 rounded-3xl border flex flex-col items-center text-center space-y-6", isDarkMode ? "bg-jeans-dark/50 border-jeans-blue/20" : "bg-white border-maria-pink/10")}>
                  <div className="relative">
                    <div className={cn("w-20 h-20 rounded-full border-4 border-t-transparent animate-spin", isDarkMode ? "border-jeans-blue" : "border-maria-pink")} />
                    <Sparkles className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2", isDarkMode ? "text-jeans-blue" : "text-maria-pink")} size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Criando sua estratégia...</h3>
                    <p className="text-sm opacity-60">Analisando tendências e seu estoque para o melhor resultado.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className={cn("p-6 rounded-3xl border shadow-sm space-y-4", isDarkMode ? "bg-jeans-dark border-jeans-blue/20" : "bg-white border-maria-pink/10")}>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-50">
                      <CheckCircle size={14} /> Desafio do Dia
                    </div>
                    <h3 className="text-xl font-bold leading-tight">{marketingChallenge?.challenge}</h3>
                    
                    {marketingChallenge?.image && (
                      <div className="relative aspect-square rounded-2xl overflow-hidden border shadow-inner">
                        <img src={marketingChallenge.image} alt="Referência" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent text-white">
                          <p className="text-[10px] font-bold uppercase opacity-80">Ideia de composição</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-50">
                        <Camera size={14} /> Legenda Sugerida
                      </div>
                      <div className={cn("p-4 rounded-2xl text-sm italic leading-relaxed", isDarkMode ? "bg-jeans-blue/10" : "bg-maria-pink/5")}>
                        "{marketingChallenge?.script}"
                      </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button 
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({
                              title: 'Meta de Marketing Maria Jeans',
                              text: `${marketingChallenge?.challenge}\n\nLegenda: ${marketingChallenge?.script}`,
                            });
                          } else {
                            alert('Copiado para a área de transferência!');
                            navigator.clipboard.writeText(`${marketingChallenge?.challenge}\n\nLegenda: ${marketingChallenge?.script}`);
                          }
                        }}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2",
                          isDarkMode ? "bg-jeans-blue" : "bg-maria-pink"
                        )}
                      >
                        Compartilhar Meta
                      </button>
                      <button 
                        onClick={generateMarketingChallenge}
                        className={cn(
                          "p-3 rounded-xl border transition-all active:scale-95",
                          isDarkMode ? "border-jeans-blue/30 text-jeans-blue" : "border-maria-pink/30 text-maria-pink"
                        )}
                        title="Gerar outra ideia"
                      >
                        <RefreshCw size={20} className={isGeneratingMarketing ? "animate-spin" : ""} />
                      </button>
                    </div>
                  </div>

                  <div className={cn("p-6 rounded-3xl border border-dashed flex items-start gap-4", isDarkMode ? "bg-jeans-blue/5 border-jeans-blue/20" : "bg-maria-pink/5 border-maria-pink/20")}>
                    <div className={cn("p-2 rounded-lg", isDarkMode ? "bg-jeans-blue/20 text-jeans-blue" : "bg-maria-pink/10 text-maria-pink")}>
                      <Lightbulb size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-1">Dica da Maria</h4>
                      <p className="text-xs opacity-70 leading-relaxed">Lembre-se de usar uma boa iluminação natural! Fotos tiradas perto da janela costumam valorizar muito mais o jeans.</p>
                    </div>
                  </div>
                </div>
              )}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-dashed border-black/10">
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold opacity-50 uppercase flex items-center gap-2">
                        <Package size={16} /> Categorias
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                          <div key={cat} className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30" : "bg-maria-pink/5 border-maria-pink/20 text-maria-pink")}>
                            {cat}
                            <button type="button" onClick={() => setCategories(categories.filter(c => c !== cat))} className="hover:text-red-500"><X size={12} /></button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => {
                            const name = prompt('Nome da nova categoria:');
                            if (name && !categories.includes(name)) setCategories([...categories, name]);
                          }}
                          className={cn("px-3 py-1 rounded-full text-xs font-bold border border-dashed", isDarkMode ? "border-jeans-blue/30" : "border-maria-pink/30")}
                        >
                          + Adicionar
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-sm font-bold opacity-50 uppercase flex items-center gap-2">
                        <ShoppingBag size={16} /> Marcas
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {brands.map(brand => (
                          <div key={brand} className={cn("flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30" : "bg-maria-pink/5 border-maria-pink/20 text-maria-pink")}>
                            {brand}
                            <button type="button" onClick={() => setBrands(brands.filter(b => b !== brand))} className="hover:text-red-500"><X size={12} /></button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          onClick={() => {
                            const name = prompt('Nome da nova marca:');
                            if (name && !brands.includes(name)) setBrands([...brands, name]);
                          }}
                          className={cn("px-3 py-1 rounded-full text-xs font-bold border border-dashed", isDarkMode ? "border-jeans-blue/30" : "border-maria-pink/30")}
                        >
                          + Adicionar
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-dashed border-black/10">
                    <div className="bg-jeans-blue/5 rounded-2xl p-6 border border-jeans-blue/10">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-lg mb-1">Backup de Segurança</h3>
                          <p className="text-sm opacity-60">Baixe uma cópia manual dos seus dados ou restaure um backup antigo.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button 
                            type="button"
                            onClick={handleExportBackup}
                            className={cn(
                              "w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-md transition-all active:scale-95",
                              isDarkMode ? "bg-jeans-blue" : "bg-maria-pink"
                            )}
                          >
                            <Download size={20} /> Exportar
                          </button>
                          <label className={cn(
                            "w-full sm:w-auto px-6 py-3 rounded-xl font-bold border flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95",
                            isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 text-white" : "bg-white border-maria-pink/20 text-maria-pink"
                          )}>
                            <Upload size={20} /> Importar
                            <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                          </label>
                        </div>
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
        <NavButton active={activeTab === 'marketing'} onClick={() => setActiveTab('marketing')} icon={<Sparkles size={24} />} label="Marketing" isDarkMode={isDarkMode} />
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
                  // Update existing size
                  const updatedProduct = { 
                    ...baseData, 
                    id: editingProduct.id, 
                    size: formData.get('size') as string,
                    stock: Number(formData.get('stock')),
                    isActive: formData.get('isActive') === 'on'
                  };
                  
                  // Also check if user added NEW sizes while editing
                  const newEntries: Product[] = Object.entries(selectedSizes)
                    .filter(([_, qty]) => (qty as number) > 0)
                    .map(([size, qty]) => ({
                      ...baseData,
                      id: Math.random().toString(36).substr(2, 9),
                      size,
                      stock: qty as number,
                      isActive: true
                    }));

                  setProducts([...products.map(p => p.id === editingProduct.id ? updatedProduct : p), ...newEntries]);
                  setIsProductModalOpen(false);
                  setEditingProduct(null);
                  setSelectedSizes({});
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
                    <select 
                      name="brand" 
                      defaultValue={editingProduct?.brand || brands[0]} 
                      required 
                      className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")}
                    >
                      {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase">Tipo de Peça</label>
                    <input 
                      name="type" 
                      list="type-suggestions"
                      value={modalType}
                      onChange={(e) => {
                        const type = e.target.value;
                        setModalType(type);
                        if (modalCategory !== 'Infantil') {
                          if (['Calça', 'Bermuda', 'Shorts', 'Saia'].includes(type)) setSelectedGridType('numeric');
                          else setSelectedGridType('letters');
                        }
                      }}
                      required
                      className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")}
                      placeholder="Ex: Calça, Shorts..."
                    />
                    <datalist id="type-suggestions">
                      {allProductTypes.map(t => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase">Categoria</label>
                    <select 
                      name="category" 
                      value={modalCategory}
                      onChange={(e) => {
                        const cat = e.target.value as Category;
                        setModalCategory(cat);
                        if (cat === 'Infantil') setSelectedGridType('infantil');
                        else if (['Calça', 'Bermuda', 'Shorts', 'Saia'].includes(modalType)) setSelectedGridType('numeric');
                        else setSelectedGridType('letters');
                      }}
                      className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")}
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  {editingProduct ? (
                    <>
                      <div className="col-span-2 p-4 bg-maria-pink/5 rounded-2xl border border-maria-pink/10 mb-2">
                        <p className="text-[10px] font-bold uppercase opacity-50 mb-3">Editando Tamanho Atual</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold opacity-50 uppercase">Tamanho</label>
                            <input name="size" defaultValue={editingProduct.size} required className={cn("w-full px-4 py-3 rounded-xl border", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30" : "bg-white border-maria-pink/20")} />
                          </div>
                          <div>
                            <label className="text-xs font-bold opacity-50 uppercase">Estoque</label>
                            <input name="stock" type="number" defaultValue={editingProduct.stock} required className={cn("w-full px-4 py-3 rounded-xl border", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30" : "bg-white border-maria-pink/20")} />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}

                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase">Preço Compra (R$)</label>
                    <input 
                      name="buyPrice" 
                      type="number" 
                      step="0.01" 
                      value={modalBuyPrice || ''} 
                      onChange={(e) => setModalBuyPrice(Number(e.target.value))}
                      required 
                      className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")} 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold opacity-50 uppercase">Preço Venda (R$)</label>
                    <input 
                      name="sellPrice" 
                      type="number" 
                      step="0.01" 
                      value={modalSellPrice || ''} 
                      onChange={(e) => setModalSellPrice(Number(e.target.value))}
                      required 
                      className={cn("w-full px-4 py-3 rounded-xl border focus:ring-2", isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 focus:ring-jeans-blue" : "bg-gray-50 border-maria-pink/20 focus:ring-maria-pink")} 
                    />
                  </div>

                  {editingProduct && (
                    <div className="col-span-2">
                      <label className="flex items-center gap-3 p-4 rounded-xl border cursor-pointer hover:bg-black/5 transition-colors">
                        <input 
                          type="checkbox" 
                          name="isActive" 
                          defaultChecked={editingProduct.isActive !== false}
                          className="w-5 h-5 rounded accent-maria-pink"
                        />
                        <div>
                          <p className="font-bold text-sm">Produto Ativo</p>
                          <p className="text-xs opacity-60">Se desativado, o produto não poderá ser vendido.</p>
                        </div>
                      </label>
                    </div>
                  )}
                  
                  {modalBuyPrice > 0 && modalSellPrice > 0 && (
                    <div className="col-span-2">
                      <div className={cn(
                        "p-3 rounded-xl flex items-center justify-between",
                        isDarkMode ? "bg-jeans-blue/5" : "bg-gray-50"
                      )}>
                        <span className="text-xs font-bold opacity-60 uppercase">Margem de Lucro</span>
                        <span className={cn(
                          "font-bold",
                          modalSellPrice > modalBuyPrice ? "text-green-500" : "text-red-500"
                        )}>
                          {(((modalSellPrice - modalBuyPrice) / modalBuyPrice) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Size Grid Section */}
                <div className="space-y-4 pt-4 border-t border-dashed border-black/10">
                    <div className="space-y-2">
                      <label className="text-xs font-bold opacity-50 uppercase">
                        {editingProduct ? 'Adicionar Outros Tamanhos a este Modelo' : 'Tipo de Grade de Tamanho'}
                      </label>
                      <div className="flex gap-2">
                        {[
                          { id: 'numeric', label: '34-58' },
                          { id: 'letters', label: 'PP-G3' },
                          { id: 'infantil', label: 'Infantil' }
                        ].map(type => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => {
                              setSelectedGridType(type.id as any);
                              setSelectedSizes({});
                            }}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-xl border transition-all",
                              selectedGridType === type.id 
                                ? (isDarkMode ? "bg-jeans-blue border-jeans-blue text-white" : "bg-maria-pink border-maria-pink text-white")
                                : (isDarkMode ? "bg-jeans-blue/10 border-jeans-blue/30 text-white/60" : "bg-gray-50 border-maria-pink/10 text-gray-500")
                            )}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-xs font-bold opacity-40 uppercase tracking-widest">Grade de Tamanhos & Quantidade</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setSelectedSizes({})} className="text-[10px] underline opacity-50">Limpar</button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {(() => {
                        const grid = SIZE_GRIDS[selectedGridType];

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

                <button type="submit" className={cn("w-full py-4 rounded-2xl font-bold text-white shadow-lg", isDarkMode ? "bg-jeans-blue" : "bg-maria-pink")}>
                  {editingProduct ? 'Salvar Alterações e Novos Tamanhos' : 'Cadastrar Lote de Produtos'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isStockAlertOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsStockAlertOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={cn("relative w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center", isDarkMode ? "bg-jeans-dark text-white" : "bg-white text-gray-800")}>
              <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Package size={40} />
              </div>
              <h2 className="text-2xl font-bold mb-2">Produto Sem Estoque</h2>
              <p className="opacity-60 mb-8">
                O produto <span className="font-bold">{stockAlertProduct?.model}</span> (Tam: {stockAlertProduct?.size}) não possui unidades disponíveis no momento.
              </p>
              <button 
                onClick={() => setIsStockAlertOpen(false)}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold text-white shadow-lg",
                  isDarkMode ? "bg-jeans-blue" : "bg-maria-pink"
                )}
              >
                Entendido
              </button>
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
                      <p className="text-[10px] opacity-60 uppercase font-bold">{item.brand} - Tam: {item.size}</p>
                      <p className="text-xs font-bold text-maria-pink">R$ {item.sellPrice.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2 bg-black/5 rounded-xl p-1">
                        <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 hover:bg-black/10 rounded-lg transition-colors"><MinusCircle size={18} /></button>
                        <input 
                          type="number" 
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            const product = products.find(p => p.id === item.id);
                            if (!isNaN(val) && val > 0 && product && val <= product.stock) {
                              setCart(cart.map(c => c.id === item.id ? { ...c, quantity: val } : c));
                            }
                          }}
                          className="w-8 text-center bg-transparent font-bold text-sm focus:outline-none"
                        />
                        <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 hover:bg-black/10 rounded-lg transition-colors"><PlusCircle size={18} /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-[10px] text-red-500 font-bold uppercase hover:underline">Remover</button>
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
