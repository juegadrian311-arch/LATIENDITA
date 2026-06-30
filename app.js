// ==========================================
// CONFIGURACIÓN E INICIALIZACIÓN DE FIREBASE (COMPAT SDK)
// ==========================================

// Configuración del proyecto Firebase del usuario
const firebaseConfig = {
  apiKey: "AIzaSyAhOg_Sg8GS-18HhbTKFEg9A4IYmU4frXo",
  authDomain: "latiendita-aeeab.firebaseapp.com",
  projectId: "latiendita-aeeab",
  storageBucket: "latiendita-aeeab.firebasestorage.app",
  messagingSenderId: "44020068652",
  appId: "1:44020068652:web:71967812fd9f0f1ee47c89",
  databaseURL: "https://latiendita-aeeab-default-rtdb.firebaseio.com" // URL de Realtime Database de tu captura
};

// Inicialización de Firebase y Realtime Database
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ==========================================
// UTILERÍAS DE CONTROL DE TIEMPO (TIMEOUT)
// ==========================================

// Envoltura para evitar que las promesas de Firebase se queden colgadas (offline/cuelgues)
function withTimeout(promise, ms = 6000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("Tiempo de espera agotado en la nube. Verifica tu conexión o las reglas de tu Firebase Realtime Database."));
        }, ms);
        promise.then(
            (res) => {
                clearTimeout(timer);
                resolve(res);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            }
        );
    });
}

// ==========================================
// BASE DE DATOS LOCAL E INVENTARIO BASE UNIFICADO
// ==========================================

const defaultProductsCatalog = [
    { id: 101, title: "Mini Aspiradora de Mano Pro USB", price: 349.00, desc: "Fuerte poder de succión ideal para el hogar y electrodomésticos compactos.", category: "electrodomesticos", images: ["https://images.unsplash.com/photo-1563161431-e4199c5c9911?w=500"], salesCount: 45, ticketReward: 2, reviews: [{user:"Luis M.", stars:5, comment:"Excelente succión para el teclado y coche."}] },
    { id: 102, title: "Labial Velvet Matte Larga Duración", price: 189.00, desc: "Fórmula hidratante premium, acabado mate aterciopelado perfecto.", category: "belleza", images: ["https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500"], salesCount: 88, ticketReward: 2, reviews: [{user:"Ana P.", stars:5, comment:"El color es idéntico y dura todo el día."}] },
    { id: 103, title: "Organizador Multifuncional de Hogar", price: 299.00, desc: "Ahorra espacio con estilo. Plástico resistente de alta calidad.", category: "hogar", images: ["https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500"], salesCount: 12, ticketReward: 2, reviews: [] },
    { id: 104, title: "Serum Hidratante Ácido Hialurónico", price: 245.00, desc: "Cuidado profundo para tu piel. Absorción rápida sin sensación grasa.", category: "cuidado", images: ["https://images.unsplash.com/photo-1608248597481-496100c80836?w=500"], salesCount: 61, ticketReward: 2, reviews: [{user:"Gaby R.", stars:4, comment:"Deja la piel muy suave."}] }
];

let productsInventory = [];
let walletBalance = parseFloat(localStorage.getItem('walletBalance_v2')) || 0.00;
let luckyTickets = parseInt(localStorage.getItem('luckyTickets_v2')) || 0;
let cart = JSON.parse(localStorage.getItem('cart_v2')) || [];
let isSpinning = false;

// BITÁCORA MAESTRA DE CLIENTES
let clientsOrdersLog = [];

let transactionHistory = JSON.parse(localStorage.getItem('transactionHistory_v2')) || [
    { fecha: "Reciente", tipo: "Sistema", detalle: "Cartera Épica Activada", monto: 0, icono: "✨" }
];

let currentImagesList = [];
let currentImageIndex = 0;
let activeProductContextId = null;

function saveToDatabase() {
    localStorage.setItem('walletBalance_v2', walletBalance);
    localStorage.setItem('luckyTickets_v2', luckyTickets);
    localStorage.setItem('cart_v2', JSON.stringify(cart));
    localStorage.setItem('transactionHistory_v2', JSON.stringify(transactionHistory));
}

// ==========================================
// RENDERIZADO CON FILTRADO REAL Y MÁS VENDIDOS
// ==========================================
function renderProducts() {
    const mainGrid = document.getElementById('main-products-grid');
    const bestsellersGrid = document.getElementById('bestsellers-grid');
    if (!mainGrid) return;

    mainGrid.innerHTML = '';
    if (bestsellersGrid) bestsellersGrid.innerHTML = '';

    const searchQuery = document.getElementById('store-search-input') ? document.getElementById('store-search-input').value.toLowerCase().trim() : "";
    const filterCat = document.getElementById('filter-category') ? document.getElementById('filter-category').value : "all";
    const priceOrder = document.getElementById('filter-price-order') ? document.getElementById('filter-price-order').value : "default";

    // 1. Filtrar productos por búsqueda y categoría real
    let filtered = productsInventory.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery) || p.desc.toLowerCase().includes(searchQuery);
        const matchesCategory = (filterCat === "all" || p.category === filterCat);
        return matchesSearch && matchesCategory;
    });

    // 2. Ordenar por precio si es requerido
    if (priceOrder === "low-high") {
        filtered.sort((a, b) => a.price - b.price);
    } else if (priceOrder === "high-low") {
        filtered.sort((a, b) => b.price - a.price);
    }

    // 3. Renderizar productos en la cuadrícula principal
    filtered.forEach(prod => {
        const imgSrc = prod.images && prod.images[0] ? prod.images[0] : "";
        const imgContent = imgSrc.startsWith('http') 
            ? `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.parentElement.innerHTML='📦';">` 
            : '📦';

        mainGrid.innerHTML += `
            <div class="product-card" onclick="openProductDetail('${prod.id}')">
                <div class="product-img-placeholder">${imgContent}</div>
                <div class="badge-free-shipping">🚚 Envío Gratis</div>
                <h3 class="product-title">${prod.title}</h3>
                <p class="product-price">$${prod.price.toFixed(2)}</p>
                <div class="card-action-row">
                    <span class="card-reward-text">🎁 +${prod.ticketReward || 2} Tickets</span>
                    <button class="btn-buy-icon" onclick="addToCart('${prod.id}', event)">🛒</button>
                </div>
            </div>
        `;
    });

    // 4. Renderizar Sección de Más Vendidos (Productos con salesCount >= 40)
    if (bestsellersGrid) {
        let bestsellers = productsInventory.filter(p => p.salesCount && p.salesCount >= 40);
        if (bestsellers.length === 0) {
            document.getElementById('section-bestsellers').style.display = 'none';
        } else {
            document.getElementById('section-bestsellers').style.display = 'block';
            bestsellers.forEach(prod => {
                const imgSrc = prod.images && prod.images[0] ? prod.images[0] : "";
                const imgContent = imgSrc.startsWith('http') ? `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;">` : '📦';
                
                bestsellersGrid.innerHTML += `
                    <div class="product-card" onclick="openProductDetail('${prod.id}')">
                        <div class="product-img-placeholder">${imgContent}</div>
                        <div class="badge-free-shipping" style="background:rgba(255,71,87,0.15); border-color:#ff4757; color:#ff4757;">🔥 Más Vendido</div>
                        <h3 class="product-title">${prod.title}</h3>
                        <p class="product-price">$${prod.price.toFixed(2)}</p>
                        <div class="card-action-row">
                            <span class="card-reward-text">🎁 +${prod.ticketReward || 2} Tickets</span>
                            <button class="btn-buy-icon" onclick="addToCart('${prod.id}', event)">🛒</button>
                        </div>
                    </div>
                `;
            });
        }
    }
}

window.filterStoreProducts = function() {
    renderProducts();
};

function updateWalletUI() {
    if(document.getElementById('wallet-balance')) document.getElementById('wallet-balance').innerText = `$${walletBalance.toFixed(2)}`;
    if(document.getElementById('tickets-count')) document.getElementById('tickets-count').innerText = luckyTickets;
    if(document.getElementById('cart-badge')) document.getElementById('cart-badge').innerText = cart.length;
}

// ==========================================
// VISTA DETALLE, RESEÑAS Y CARRUSEL
// ==========================================
window.openProductDetail = function(id) {
    const prod = productsInventory.find(p => p.id === id);
    if (!prod) return;

    activeProductContextId = id;
    document.getElementById('detail-title').innerText = prod.title;
    document.getElementById('detail-category').innerText = `Categoría: ${prod.category}`;
    document.getElementById('detail-price').innerText = `$${prod.price.toFixed(2)}`;
    document.getElementById('detail-desc').innerText = prod.desc;

    // Actualizar cantidad de boletos en la UI del detalle
    const rewardBadge = document.getElementById('detail-reward-badge');
    if (rewardBadge) {
        rewardBadge.innerText = `🎁 Recompensa: +${prod.ticketReward || 2} Boletos Gacha por Compra`;
    }

    const addBtn = document.getElementById('detail-add-btn');
    addBtn.onclick = function(e) { addToCart(prod.id, e); };

    currentImagesList = prod.images && prod.images.length > 0 ? prod.images : ["#1f2833"];
    currentImageIndex = 0;
    updateCarouselUI();
    renderReviewsList(prod.reviews || []);

    document.getElementById('product-detail-modal').style.display = 'flex';
};

window.closeProductDetail = function() {
    document.getElementById('product-detail-modal').style.display = 'none';
    activeProductContextId = null;
};

function updateCarouselUI() {
    const view = document.getElementById('carousel-main-view');
    const indexLabel = document.getElementById('carousel-index');
    if(!view) return;
    
    const currentImg = currentImagesList[currentImageIndex];
    if (currentImg && currentImg.startsWith('http')) {
        view.style.backgroundImage = `url('${currentImg}')`;
        view.innerHTML = "";
    } else {
        view.style.backgroundImage = "none";
        view.innerHTML = `📸 Sin Imagen`;
    }
    if(indexLabel) indexLabel.innerText = `${currentImageIndex + 1} / ${currentImagesList.length}`;
}

window.changeCarouselImage = function(direction) {
    currentImageIndex += direction;
    if (currentImageIndex < 0) currentImageIndex = currentImagesList.length - 1;
    if (currentImageIndex >= currentImagesList.length) currentImageIndex = 0;
    updateCarouselUI();
};

// MANDAR RESEÑA A CAMBIO DE 1 TICKET EN REALTIME DATABASE
window.submitProductReview = async function(event) {
    event.preventDefault();
    if (!activeProductContextId) return;

    const name = document.getElementById('rev-name').value.trim();
    const stars = parseInt(document.getElementById('rev-stars').value);
    const comment = document.getElementById('rev-comment').value.trim();

    const prod = productsInventory.find(p => p.id === activeProductContextId);
    if (prod) {
        const updatedReviews = prod.reviews || [];
        updatedReviews.unshift({ user: name, stars: stars, comment: comment });
        
        try {
            await withTimeout(
                db.ref("products").child(activeProductContextId).update({
                    reviews: updatedReviews
                })
            );
            
            luckyTickets += 1; // Incentivo: 1 Ticket gratis
            addTransaction("Recompensa", `Reseña de producto: +1 Ticket`, 0, "🎫");
            saveToDatabase();
            updateWalletUI();
            
            document.getElementById('add-review-form').reset();
            alert("🎉 ¡Gracias por tu opinión! Se ha añadido 1 Ticket de la Suerte a tu cuenta.");
        } catch (e) {
            console.error("Error al añadir reseña: ", e);
            alert("❌ Error al guardar reseña en Firebase: " + e.message);
        }
    }
};

function renderReviewsList(reviews) {
    const container = document.getElementById('product-reviews-list');
    if (!container) return;
    container.innerHTML = '';

    if(reviews.length === 0) {
        container.innerHTML = `<p style="color:#747d8c; font-size:0.85rem;">Aún no hay reseñas de este producto. ¡Sé el primero!</p>`;
        return;
    }

    reviews.forEach(r => {
        let starsStr = "⭐".repeat(r.stars);
        container.innerHTML += `
            <div class="review-item-card">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.85rem;">
                    <strong>👤 ${r.user}</strong>
                    <span style="color:#ffa502;">${starsStr}</span>
                </div>
                <p style="font-size:0.85rem; color:#a4b0be;">${r.comment}</p>
            </div>
        `;
    });
}

// ==========================================
// CONTROL DEL CARRITO Y LOGÍSTICA
// ==========================================
window.toggleCartModal = function() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        modal.style.display = 'flex';
        renderCartItems();
    }
};

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalDisplay = document.getElementById('cart-total-price');
    if (!container || !totalDisplay) return;

    if (cart.length === 0) {
        container.innerHTML = `<p style="color:#a4b0be; text-align:center; padding:20px;">Tu carrito está vacío.</p>`;
        totalDisplay.innerText = "$0.00";
        return;
    }

    container.innerHTML = '';
    let total = 0;

    cart.forEach((prod, index) => {
        total += prod.price;
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #1f2833;">
                <div>
                    <span style="font-weight:600; color:#fff;">${prod.title}</span><br>
                    <small style="color:#45a29e; text-transform:uppercase; font-size:0.75rem;">${prod.category}</small>
                </div>
                <div style="display:flex; gap:15px; align-items:center;">
                    <span style="color:#66fcf1; font-weight:bold;">$${prod.price.toFixed(2)}</span>
                    <button style="background:none; border:none; color:#ff4757; cursor:pointer; font-size:1.2rem;" onclick="removeFromCart(${index})">&times;</button>
                </div>
            </div>
        `;
    });

    totalDisplay.innerText = `$${total.toFixed(2)}`;
}

window.addToCart = function(id, event) {
    if (event) event.stopPropagation();
    const prod = productsInventory.find(p => p.id === id);
    if(!prod) return;

    cart.push(prod);
    saveToDatabase();
    updateWalletUI();
    alert(`🛒 Se añadió "${prod.title}" al carrito.`);
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveToDatabase();
    updateWalletUI();
    renderCartItems();
};

// PASARELA DE PAGO INTERNA
let temporaryOrderData = null;

window.checkoutCart = function() {
    if(cart.length === 0) return;

    const name = document.getElementById('ship-name').value.trim();
    const phone = document.getElementById('ship-phone').value.trim();
    const address = document.getElementById('ship-address').value.trim();
    const city = document.getElementById('ship-city').value.trim();

    if(!name || !phone || !address || !city) {
        alert("⚠️ Completa los datos de envío para poder procesar la compra.");
        return;
    }

    let total = cart.reduce((sum, item) => sum + item.price, 0);
    
    temporaryOrderData = { name, phone, address, city, total, items: [...cart] };

    document.getElementById('gate-total-price').innerText = `$${total.toFixed(2)}`;
    document.getElementById('cart-modal').style.display = 'none';
    document.getElementById('payment-gate-modal').style.display = 'flex';
};

window.closePaymentGate = function() {
    document.getElementById('payment-gate-modal').style.display = 'none';
};

window.processGatePayment = function() {
    const card = document.getElementById('card-number').value.trim();
    const expiry = document.getElementById('card-expiry').value.trim();
    const cvc = document.getElementById('card-cvc').value.trim();

    if (card.length < 16 || expiry.length < 5 || cvc.length < 3) {
        alert("❌ Error: Datos de tarjeta bancaria incompletos.");
        return;
    }

    const payBtn = document.getElementById('btn-gate-pay');
    payBtn.disabled = true;
    payBtn.innerText = "🔒 Encriptando conexión segura...";

    setTimeout(async () => {
        try {
            const timestamp = new Date().toLocaleString();
            const orderId = "ORD-" + Date.now().toString().slice(-6);
            
            // 1. Registrar pedido en Realtime Database
            await withTimeout(
                db.ref("orders").push({
                    id: orderId,
                    fecha: timestamp,
                    cliente: temporaryOrderData.name,
                    telefono: temporaryOrderData.phone,
                    direccion: `${temporaryOrderData.address}, ${temporaryOrderData.city}`,
                    detalles: temporaryOrderData.items.map(i => i.title).join(' | '),
                    total: temporaryOrderData.total,
                    timestamp: Date.now()
                })
            );

            // 2. Sumar contadores de ventas en Realtime Database
            for (const item of temporaryOrderData.items) {
                try {
                    const prodSalesRef = db.ref("products").child(String(item.id)).child("salesCount");
                    await prodSalesRef.transaction((currentSalesCount) => {
                        return (currentSalesCount || 0) + 1;
                    });
                } catch (prodErr) {
                    console.warn("No se pudo actualizar salesCount del producto " + item.id + ":", prodErr);
                }
            }

            // 3. Calcular tickets dinámicamente según la recompensa configurada del producto
            const earnedTickets = temporaryOrderData.items.reduce((sum, item) => sum + (parseInt(item.ticketReward) || 2), 0);
            luckyTickets += earnedTickets;
            addTransaction("Compra", `Pago aprobado: +${earnedTickets} Tickets`, -temporaryOrderData.total, "💳");
            
            cart = [];
            saveToDatabase();
            updateWalletUI();

            alert(`💳 ¡PAGO APROBADO CON ÉXITO VIA PASARELA!\nLa información ha sido enviada al servidor de Firebase y al panel de control logístico.\n¡Ganaste +${earnedTickets} boletos de la suerte!`);
            
            payBtn.disabled = false;
            payBtn.innerText = "Aprobar Transacción Bancaria 💳";
            
            document.getElementById('ship-name').value = "";
            document.getElementById('ship-phone').value = "";
            document.getElementById('ship-address').value = "";
            document.getElementById('ship-city').value = "";
            
            closePaymentGate();
            renderProducts();
        } catch (e) {
            console.error("Error al procesar el pago en Firestore: ", e);
            alert("❌ Error de comunicación con Firebase Realtime Database: " + e.message);
            payBtn.disabled = false;
            payBtn.innerText = "Aprobar Transacción Bancaria 💳";
        }
    }, 2500);
};

// SIMULADOR DE RASTREO
window.trackUserOrder = function() {
    const input = document.getElementById('tracking-id-input').value.trim();
    const display = document.getElementById('tracking-result-display');
    if(!input || !display) return;

    display.style.display = "block";
    const match = clientsOrdersLog.find(o => 
        o.telefono.includes(input) || 
        o.cliente.toLowerCase().includes(input.toLowerCase()) ||
        o.id === input
    );

    if (match) {
        display.innerHTML = `
            <span style="color:#2ed573;">✔ Pedido Encontrado:</span> <strong>${match.id}</strong><br>
            <small>Productos: ${match.detalles}</small><br>
            <strong>Estado Actual:</strong> <span style="color:#ffa502;">En tránsito internacional (Vuelo de Carga) ✈️</span><br>
            <small>Garantía de Satisfacción Total Aplicada.</small>
        `;
    } else {
        display.innerHTML = `
            <span style="color:#ff4757;">ℹ️ Estado de Envío Estándar:</span> El paquete asociado al código/teléfono se encuentra listo en almacén central esperando despacho de aduana. Todos los envíos son gratis.
        `;
    }
};

// ==========================================
// RECOMPENSAS: RULETA GACHA
// ==========================================
if(document.getElementById('btn-spin')) {
    document.getElementById('btn-spin').onclick = function() {
        if (luckyTickets <= 0 || isSpinning) return alert("¡No tienes boletos suficientes!");

        isSpinning = true;
        luckyTickets--;
        saveToDatabase();
        updateWalletUI();

        const wheel = document.getElementById('wheel');
        
        const premios = [
            { premio: 5.00, label: "Cashback Épico de $5.00" },
            { premio: 2.00, label: "Cashback de $2.00" },
            { premio: 1.00, label: "Cashback de $1.00" },
            { premio: 0.50, label: "Cashback de $0.50" },
            { premio: 3.00, label: "Cashback Súper de $3.00" }
        ];

        const indexPremio = Math.floor(Math.random() * premios.length);
        const resultado = premios[indexPremio];
        
        const gradosPorSegmento = 360 / premios.length; 
        const anguloDestino = 360 - (indexPremio * gradosPorSegmento);
        const vueltasCompletas = 1440; 
        const anguloFinal = vueltasCompletas + anguloDestino; 

        if(wheel) {
            wheel.style.transform = `rotate(${anguloFinal}deg)`;
        }

        setTimeout(() => {
            isSpinning = false;
            walletBalance += resultado.premio;
            addTransaction("Ruleta", `Ganaste: ${resultado.label}`, resultado.premio, "🎰");
            
            alert(`🎰 ¡RULETA DETENIDA COMPLETAMENTE!\nPremio obtenido: +$${resultado.premio.toFixed(2)} pesos MXN.`);
            
            saveToDatabase();
            updateWalletUI();
        }, 4000); 
    };
}

window.addTransaction = function(tipo, detalle, monto, icono) {
    const tiempoEstampa = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    transactionHistory.unshift({ fecha: tiempoEstampa, tipo: tipo, detalle: detalle, monto: monto, icono: icono });
    if(transactionHistory.length > 15) transactionHistory.pop();
    saveToDatabase();
};

window.toggleHistoryModal = function() {
    const modal = document.getElementById('history-modal');
    if (!modal) return;
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        modal.style.display = 'flex';
        renderHistoryItems();
    }
};

function renderHistoryItems() {
    const container = document.getElementById('history-items-container');
    if (!container) return;
    container.innerHTML = '';

    transactionHistory.forEach(item => {
        const colorMonto = item.monto > 0 ? '#66fcf1' : (item.monto < 0 ? '#ff4757' : '#a4b0be');
        const signo = item.monto > 0 ? '+' : '';
        container.innerHTML += `
            <div style="background:#0b0c10; padding:12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; border-left:3px solid ${colorMonto};">
                <div>
                    <span style="font-size:0.95rem; color:#fff;">${item.icono} <strong>${item.detalle}</strong></span><br>
                    <small style="color:#747d8c;">${item.fecha} | ${item.tipo}</small>
                </div>
                <span style="color:${colorMonto}; font-weight:bold;">
                    ${item.monto !== 0 ? signo + '$' + item.monto.toFixed(2) : '---'}
                </span>
            </div>
        `;
    });
}

// ==========================================
// CONSOLA PRIVADA DE ADMINISTRACIÓN CMS
// ==========================================
window.openAdminPanel = function() {
    const password = prompt("🔐 Introduce la contraseña secreta de administrador:");
    if (password === "micanal311") {
        document.getElementById('admin-panel').style.display = 'block';
        renderAdminDashboardData();
    } else {
        alert("❌ Contraseña incorrecta.");
    }
};

window.closeAdminPanel = function() {
    document.getElementById('admin-panel').style.display = 'none';
};

function renderAdminDashboardData() {
    let totalLiquidity = clientsOrdersLog.reduce((sum, order) => sum + order.total, 0);
    document.getElementById('admin-total-liquidity').innerText = `$${totalLiquidity.toFixed(2)}`;
    document.getElementById('admin-total-orders-count').innerText = clientsOrdersLog.length;

    const tableBody = document.getElementById('admin-orders-table-body');
    if (tableBody) {
        if(clientsOrdersLog.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#747d8c;">Ningún pedido registrado en esta sesión.</td></tr>`;
        } else {
            tableBody.innerHTML = '';
            clientsOrdersLog.forEach(order => {
                tableBody.innerHTML += `
                    <tr>
                        <td>${order.fecha}</td>
                        <td style="font-weight:bold; color:#66fcf1;">${order.cliente}</td>
                        <td>${order.telefono}</td>
                        <td style="font-size:0.8rem;">${order.direccion}</td>
                        <td style="color:#ffa502; font-size:0.8rem;">${order.detalles}</td>
                        <td style="color:#2ed573; font-weight:bold;">$${order.total.toFixed(2)}</td>
                    </tr>
                `;
            });
        }
    }

    const invContainer = document.getElementById('admin-inventory-list');
    if (invContainer) {
        invContainer.innerHTML = '';
        productsInventory.forEach(p => {
            invContainer.innerHTML += `
                <div class="inventory-item-row-dash">
                    <span style="font-size:0.85rem;">[${p.category.toUpperCase()}] <strong>${p.title}</strong> - $${p.price.toFixed(2)} (Ventas: ${p.salesCount || 0})</span>
                    <button onclick="deleteProductFromAdmin('${p.id}')" style="background:#ff4757; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem;">Eliminar 🗑️</button>
                </div>
            `;
        });
    }
}

window.createNewProduct = async function(event) {
    event.preventDefault();
    const title = document.getElementById('new-title').value;
    const price = parseFloat(document.getElementById('new-price').value);
    const desc = document.getElementById('new-desc').value;
    const category = document.getElementById('new-category').value;
    const imagesInput = document.getElementById('new-images').value;
    const tickets = parseInt(document.getElementById('new-tickets').value) || 2;

    let imagesList = imagesInput.trim() !== "" ? imagesInput.split(',').map(url => url.trim()) : [""];

    try {
        await withTimeout(
            db.ref("products").push({
                title: title,
                price: price,
                desc: desc,
                category: category,
                images: imagesList,
                salesCount: 0,
                reviews: [],
                ticketReward: tickets
            })
        );

        document.getElementById('add-product-form').reset();
        alert("🎉 Producto agregado exitosamente al inventario.");
    } catch (e) {
        console.error("Error al crear producto: ", e);
        alert("❌ Error al guardar producto en Firebase: " + e.message);
    }
};

window.deleteProductFromAdmin = async function(id) {
    if(!confirm("⚠️ ¿Deseas eliminar este producto del sistema?")) return;
    try {
        await withTimeout(db.ref("products").child(id).remove());
        alert("🗑️ Producto eliminado exitosamente.");
    } catch (e) {
        console.error("Error al eliminar producto: ", e);
        alert("❌ Error al eliminar en Firebase: " + e.message);
    }
};

// ==========================================
// SINCRONIZACIÓN Y ARRANQUE DE FIREBASE (REALTIME DATABASE)
// ==========================================

async function seedDefaultProducts() {
    try {
        for (const p of defaultProductsCatalog) {
            const { id, ...data } = p;
            await db.ref("products").push({ ...data, salesCount: p.salesCount || 0 });
        }
        console.log("Inventario inicial sembrado en Realtime Database con éxito.");
    } catch (e) {
        console.error("Error al sembrar inventario por defecto: ", e);
    }
}

// Listener en tiempo real para la colección de Productos
db.ref("products").on("value", (snapshot) => {
    const fetchedProducts = [];
    snapshot.forEach((childSnapshot) => {
        fetchedProducts.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });

    if (fetchedProducts.length === 0) {
        // Sembrar el catálogo base si la Realtime Database está vacía
        seedDefaultProducts();
    } else {
        productsInventory = fetchedProducts.map(p => ({
            ...p,
            price: parseFloat(p.price) || 0,
            salesCount: parseInt(p.salesCount) || 0,
            id: p.id
        }));
        
        renderProducts();

        // Actualizar vista de modal de detalles si está abierto
        if (activeProductContextId) {
            const currentProd = productsInventory.find(p => p.id === activeProductContextId);
            if (currentProd) {
                renderReviewsList(currentProd.reviews || []);
            }
        }

        // Actualizar panel si está abierto
        if (document.getElementById('admin-panel') && document.getElementById('admin-panel').style.display === 'block') {
            renderAdminDashboardData();
        }
    }
});

// Listener en tiempo real para la colección de Pedidos (Ordenados por fecha)
db.ref("orders").orderByChild("timestamp").on("value", (snapshot) => {
    const fetchedOrders = [];
    snapshot.forEach((childSnapshot) => {
        fetchedOrders.push({ firestoreId: childSnapshot.key, ...childSnapshot.val() });
    });
    // Invertir el arreglo para mostrar los más recientes arriba
    clientsOrdersLog = fetchedOrders.reverse();
    
    // Actualizar panel si está abierto
    if (document.getElementById('admin-panel') && document.getElementById('admin-panel').style.display === 'block') {
        renderAdminDashboardData();
    }
});

// Inicialización de arranque limpio de la App (Carteras y UI Local)
document.addEventListener("DOMContentLoaded", () => {
    updateWalletUI();
});
