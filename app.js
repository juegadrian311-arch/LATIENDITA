// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAhOg_Sg8GS-18HhbTKFEg9A4IYmU4frXo",
  authDomain: "latiendita-aeeab.firebaseapp.com",
  projectId: "latiendita-aeeab",
  storageBucket: "latiendita-aeeab.firebasestorage.app",
  messagingSenderId: "44020068652",
  appId: "1:44020068652:web:71967812fd9f0f1ee47c89"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ==========================================
// ESTADO GLOBAL COMPARTIDO
// ==========================================
let productsInventory = [];
let clientsOrdersLog = [];
let cart = JSON.parse(localStorage.getItem('cart_v3')) || [];
let walletBalance = parseFloat(localStorage.getItem('walletBalance_v3')) || 0.00;
let luckyTickets = parseInt(localStorage.getItem('luckyTickets_v3')) || 0;
let isSpinning = false;

let transactionHistory = JSON.parse(localStorage.getItem('transactionHistory_v3')) || [
    { fecha: "Reciente", tipo: "Sistema", detalle: "Cartera Épica Sincronizada", monto: 0, icono: "✨" }
];

let currentImagesList = [];
let currentImageIndex = 0;
let activeProductContextId = null;
let temporaryOrderData = null;

// Guardado de billetera local del usuario actual
function saveLocalWallet() {
    localStorage.setItem('walletBalance_v3', walletBalance);
    localStorage.setItem('luckyTickets_v3', luckyTickets);
    localStorage.setItem('cart_v3', JSON.stringify(cart));
    localStorage.setItem('transactionHistory_v3', JSON.stringify(transactionHistory));
}

// ==========================================
// ESCUCHA EN TIEMPO REAL DESDE CLOUD FIRESTORE
// ==========================================
function startFirebaseRealtimeListeners() {
    // 1. Escuchar Catálogo de Productos
    db.collection("productos").onSnapshot((snapshot) => {
        productsInventory = [];
        snapshot.forEach((doc) => {
            let data = doc.data();
            data.firestoreId = doc.id; // Clave interna para borrar o editar
            productsInventory.push(data);
        });
        
        // Si la base en la nube está completamente vacía al inicio, meter catálogo semilla
        if(productsInventory.length === 0) {
            insertSeedData();
        } else {
            renderProducts();
            if(document.getElementById('admin-panel')?.style.display === 'block') {
                renderAdminDashboardData();
            }
        }
    });

    // 2. Escuchar Bitácora Maestra de Pedidos Recibidos
    db.collection("pedidos").orderBy("timestamp", "desc").onSnapshot((snapshot) => {
        clientsOrdersLog = [];
        snapshot.forEach((doc) => {
            clientsOrdersLog.push(doc.data());
        });
        if(document.getElementById('admin-panel')?.style.display === 'block') {
            renderAdminDashboardData();
        }
    });
}

// Carga inicial por defecto por si el servidor empieza de cero
function insertSeedData() {
    const seed = [
        { id: 101, title: "Mini Aspiradora de Mano Pro USB", price: 349.00, desc: "Fuerte poder de succión ideal para el hogar y electrodomésticos.", category: "electrodomesticos", images: ["https://images.unsplash.com/photo-1563161431-e4199c5c9911?w=500"], salesCount: 45, reviews: [] },
        { id: 102, title: "Labial Velvet Matte Larga Duración", price: 189.00, desc: "Fórmula hidratante premium, acabado aterciopelado perfecto.", category: "belleza", images: ["https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500"], salesCount: 85, reviews: [] },
        { id: 103, title: "Organizador de Espacios Elegante", price: 299.00, desc: "Diseño moderno ideal para tu hogar y cuidado del orden.", category: "hogar", images: ["https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500"], salesCount: 10, reviews: [] }
    ];
    seed.forEach(p => db.collection("productos").add(p));
}

// ==========================================
// RENDERIZADO CON FILTRADO REAL
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

    let filtered = productsInventory.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery) || p.desc.toLowerCase().includes(searchQuery);
        const matchesCategory = (filterCat === "all" || p.category === filterCat);
        return matchesSearch && matchesCategory;
    });

    if (priceOrder === "low-high") {
        filtered.sort((a, b) => a.price - b.price);
    } else if (priceOrder === "high-low") {
        filtered.sort((a, b) => b.price - a.price);
    }

    filtered.forEach(prod => {
        const imgSrc = prod.images && prod.images[0] ? prod.images[0] : "";
        const imgContent = imgSrc.startsWith('http') 
            ? `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover;" onerror="this.onerror=null; this.parentElement.innerHTML='📦';">` 
            : '📦';

        mainGrid.innerHTML += `
            <div class="product-card" onclick="openProductDetail(${prod.id})">
                <div class="product-img-placeholder">${imgContent}</div>
                <div class="badge-free-shipping">🚚 Envío Gratis</div>
                <h3 class="product-title">${prod.title}</h3>
                <p class="product-price">$${prod.price.toFixed(2)}</p>
                <div class="card-action-row">
                    <span class="card-reward-text">🎁 +2 Tickets</span>
                    <button class="btn-buy-icon" onclick="addToCart(${prod.id}, event)">🛒</button>
                </div>
            </div>
        `;
    });

    // Filtro para Los Más Vendidos (salesCount >= 40)
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
                    <div class="product-card" onclick="openProductDetail(${prod.id})">
                        <div class="product-img-placeholder">${imgContent}</div>
                        <div class="badge-free-shipping" style="background:rgba(255,71,87,0.15); border-color:#ff4757; color:#ff4757;">🔥 Más Vendido</div>
                        <h3 class="product-title">${prod.title}</h3>
                        <p class="product-price">$${prod.price.toFixed(2)}</p>
                        <div class="card-action-row">
                            <span class="card-reward-text">🎁 +2 Tickets</span>
                            <button class="btn-buy-icon" onclick="addToCart(${prod.id}, event)">🛒</button>
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
// DETALLE DE PRODUCTO, RESEÑAS CON BOLETO DE REGALO
// ==========================================
window.openProductDetail = function(id) {
    const prod = productsInventory.find(p => p.id === id);
    if (!prod) return;

    activeProductContextId = id;
    document.getElementById('detail-title').innerText = prod.title;
    document.getElementById('detail-category').innerText = `Categoría: ${prod.category}`;
    document.getElementById('detail-price').innerText = `$${prod.price.toFixed(2)}`;
    document.getElementById('detail-desc').innerText = prod.desc;

    document.getElementById('detail-add-btn').onclick = function(e) { addToCart(prod.id, e); };

    currentImagesList = prod.images && prod.images.length > 0 ? prod.images : [""];
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

// Enviar reseña a Firebase y regalar 1 Boleto
window.submitProductReview = function(event) {
    event.preventDefault();
    if (!activeProductContextId) return;

    const name = document.getElementById('rev-name').value.trim();
    const stars = parseInt(document.getElementById('rev-stars').value);
    const comment = document.getElementById('rev-comment').value.trim();

    const targetProd = productsInventory.find(p => p.id === activeProductContextId);
    if (targetProd && targetProd.firestoreId) {
        let updatedReviews = targetProd.reviews || [];
        updatedReviews.unshift({ user: name, stars: stars, comment: comment });

        // Actualizar el documento exacto en Firestore
        db.collection("productos").doc(targetProd.firestoreId).update({
            reviews: updatedReviews
        }).then(() => {
            luckyTickets += 1; // Incentivo otorgado
            addTransaction("Recompensa", `Reseña: +1 Ticket de Ruleta`, 0, "🎫");
            saveLocalWallet();
            updateWalletUI();
            
            document.getElementById('add-review-form').reset();
            alert("🎉 ¡Reseña guardada en la nube de forma profesional! Ganaste 1 boleto extra.");
        });
    }
};

function renderReviewsList(reviews) {
    const container = document.getElementById('product-reviews-list');
    if (!container) return;
    container.innerHTML = '';

    if(reviews.length === 0) {
        container.innerHTML = `<p style="color:#747d8c; font-size:0.85rem;">No hay opiniones aún. ¡Escribe una opinión y gana 1 boleto!</p>`;
        return;
    }

    reviews.forEach(r => {
        container.innerHTML += `
            <div class="review-item-card">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:0.85rem;">
                    <strong>👤 ${r.user}</strong>
                    <span style="color:#ffa502;">${"⭐".repeat(r.stars)}</span>
                </div>
                <p style="font-size:0.85rem; color:#a4b0be;">${r.comment}</p>
            </div>
        `;
    });
}

// ==========================================
// CARRITO, CHECKOUT LOGÍSTICO Y BITÁCORA EN NUBE
// ==========================================
window.toggleCartModal = function() {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    if(modal.style.display === 'flex') renderCartItems();
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
                    <small style="color:#45a29e; font-size:0.75rem;">${prod.category.toUpperCase()}</small>
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
    saveLocalWallet();
    updateWalletUI();
    alert(`🛒 "${prod.title}" agregado al carrito.`);
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveLocalWallet();
    updateWalletUI();
    renderCartItems();
};

window.checkoutCart = function() {
    if(cart.length === 0) return;

    const name = document.getElementById('ship-name').value.trim();
    const phone = document.getElementById('ship-phone').value.trim();
    const address = document.getElementById('ship-address').value.trim();
    const city = document.getElementById('ship-city').value.trim();

    if(!name || !phone || !address || !city) {
        alert("⚠️ Por favor ingresa todos los datos del despacho para procesar la orden.");
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
        alert("❌ Error en la verificación de la tarjeta.");
        return;
    }

    const payBtn = document.getElementById('btn-gate-pay');
    payBtn.disabled = true;
    payBtn.innerText = "🔒 Encriptando conexión y alertando pasarela...";

    setTimeout(() => {
        const orderId = "ORD-" + Date.now().toString().slice(-6);
        
        // Guardar el pedido en Firebase de forma remota y global
        db.collection("pedidos").add({
            id: orderId,
            fecha: new Date().toLocaleString(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            cliente: temporaryOrderData.name,
            telefono: temporaryOrderData.phone,
            direccion: `${temporaryOrderData.address}, ${temporaryOrderData.city}`,
            detalles: temporaryOrderData.items.map(i => i.title).join(' | '),
            total: temporaryOrderData.total
        }).then(() => {
            // Incrementar de forma remota el contador de ventas de cada producto en Firestore
            temporaryOrderData.items.forEach(item => {
                const target = productsInventory.find(p => p.id === item.id);
                if(target && target.firestoreId) {
                    db.collection("productos").doc(target.firestoreId).update({
                        salesCount: (target.salesCount || 0) + 1
                    });
                }
            });

            // Entregar recompensa de 2 tickets automáticos por compra realizada
            luckyTickets += 2;
            addTransaction("Compra", `Pedido ${orderId} aprobado`, -temporaryOrderData.total, "💳");
            
            cart = [];
            saveLocalWallet();
            updateWalletUI();

            alert(`💳 ¡PAGO APROBADO CON ÉXITO!\nLa orden ha sido enviada al correo logístico y registrada en el panel central.`);
            
            payBtn.disabled = false;
            payBtn.innerText = "Aprobar Transacción Bancaria 💳";
            
            document.getElementById('add-review-form').reset();
            closePaymentGate();
        }).catch((err) => {
            alert("Error al procesar la orden: " + err);
            payBtn.disabled = false;
        });

    }, 2000);
};

// ==========================================
// RASTREO LOGÍSTICO Y RULETA MATEMÁTICA
// ==========================================
window.trackUserOrder = function() {
    const input = document.getElementById('tracking-id-input').value.trim();
    const display = document.getElementById('tracking-result-display');
    if(!input || !display) return;

    display.style.display = "block";
    const match = clientsOrdersLog.find(o => o.telefono.includes(input) || o.cliente.toLowerCase().includes(input.toLowerCase()) || o.id === input);

    if (match) {
        display.innerHTML = `
            <span style="color:#66fcf1;">✔ Registro Encontrado:</span> <strong>${match.id}</strong><br>
            <small>Artículos: ${match.detalles}</small><br>
            <strong>Estado:</strong> <span style="color:#ffa502;">En tránsito aéreo logístico ✈️</span><br>
            <small>Garantía de Satisfacción Asegurada.</small>
        `;
    } else {
        display.innerHTML = `
            <span style="color:#a4b0be;">📦 Estatus Estándar:</span> Paquete preparado en almacén para despacho internacional. Todos los envíos cuentan con garantía total y logística gratuita.
        `;
    }
};

if(document.getElementById('btn-spin')) {
    document.getElementById('btn-spin').onclick = function() {
        if (luckyTickets <= 0 || isSpinning) return alert("¡No tienes boletos suficientes!");

        isSpinning = true;
        luckyTickets--;
        saveLocalWallet();
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
        const anguloFinal = 1440 + anguloDestino; 

        if(wheel) wheel.style.transform = `rotate(${anguloFinal}deg)`;

        setTimeout(() => {
            isSpinning = false;
            walletBalance += resultado.premio;
            addTransaction("Ruleta", `Resultado: ${resultado.label}`, resultado.premio, "🎰");
            
            alert(`🎰 ¡Premio Obtenido: +$${resultado.premio.toFixed(2)} pesos MXN!`);
            
            saveLocalWallet();
            updateWalletUI();
        }, 4000); 
    };
}

window.addTransaction = function(tipo, detalle, monto, icono) {
    const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    transactionHistory.unshift({ fecha: timeStr, tipo: tipo, detalle: detalle, monto: monto, icono: icono });
    if(transactionHistory.length > 15) transactionHistory.pop();
    saveLocalWallet();
};

window.toggleHistoryModal = function() {
    const modal = document.getElementById('history-modal');
    if (!modal) return;
    modal.style.display = (modal.style.display === 'flex') ? 'none' : 'flex';
    if(modal.style.display === 'flex') renderHistoryItems();
};

function renderHistoryItems() {
    const container = document.getElementById('history-items-container');
    if (!container) return;
    container.innerHTML = '';

    transactionHistory.forEach(item => {
        const color = item.monto > 0 ? '#66fcf1' : (item.monto < 0 ? '#ff4757' : '#a4b0be');
        container.innerHTML += `
            <div style="background:#0b0c10; padding:12px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; border-left:3px solid ${color};">
                <div>
                    <span style="color:#fff;">${item.icono} <strong>${item.detalle}</strong></span><br>
                    <small style="color:#747d8c;">${item.fecha} | ${item.tipo}</small>
                </div>
                <span style="color:${color}; font-weight:bold;">${item.monto !== 0 ? (item.monto > 0 ? '+' : '') + '$' + item.monto.toFixed(2) : '---'}</span>
            </div>
        `;
    });
}

// ==========================================
// CONSOLA PRIVADA DE ADMINISTRACIÓN CMS (CONTRASEÑA: micanal311)
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
    let totalLiquidity = clientsOrdersLog.reduce((sum, order) => sum + (order.total || 0), 0);
    document.getElementById('admin-total-liquidity').innerText = `$${totalLiquidity.toFixed(2)}`;
    document.getElementById('admin-total-orders-count').innerText = clientsOrdersLog.length;

    const tableBody = document.getElementById('admin-orders-table-body');
    if (tableBody) {
        if(clientsOrdersLog.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#747d8c;">Ningún pedido registrado en la nube.</td></tr>`;
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
                        <td style="color:#2ed573; font-weight:bold;">$${(order.total || 0).toFixed(2)}</td>
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
                    <button onclick="deleteProductFromAdmin('${p.firestoreId}')" style="background:#ff4757; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem;">Eliminar 🗑️</button>
                </div>
            `;
        });
    }
}

window.createNewProduct = function(event) {
    event.preventDefault();
    const title = document.getElementById('new-title').value;
    const price = parseFloat(document.getElementById('new-price').value);
    const desc = document.getElementById('new-desc').value;
    const category = document.getElementById('new-category').value;
    const imagesInput = document.getElementById('new-images').value;

    let imagesList = imagesInput.trim() !== "" ? imagesInput.split(',').map(url => url.trim()) : [""];

    // Agregar directamente a la base de datos de Firebase
    db.collection("productos").add({
        id: Date.now(),
        title: title,
        price: price,
        desc: desc,
        category: category,
        images: imagesList,
        salesCount: 0,
        reviews: []
    }).then(() => {
        document.getElementById('add-product-form').reset();
        alert("🎉 Producto subido de forma global a Cloud Firestore.");
    });
};

window.deleteProductFromAdmin = function(firestoreId) {
    if(!firestoreId || !confirm("⚠️ ¿Deseas eliminar este artículo de la base de datos global?")) return;
    db.collection("productos").doc(firestoreId).delete().then(() => {
        alert("Eliminado correctamente de la nube.");
    });
};

// Arranque limpio e inicialización del Listener en tiempo real
document.addEventListener("DOMContentLoaded", () => {
    startFirebaseRealtimeListeners();
    updateWalletUI();
});
