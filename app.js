// ==========================================
// BASE DE DATOS LOCAL Y INVENTARIO DE PRODUCTOS
// ==========================================

const defaultPremium = [
    { id: 1, title: "Labial Premium Velvet Matte", price: 349.00, desc: "Envío Express (1-3 días). Acabado mate aterciopelado de larga duración.", ticketReward: 3, category: "premium", images: ["https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500"], rating: "⭐⭐⭐⭐⭐ (4.9)" },
    { id: 2, title: "Paleta de Sombras 'Glow Night'", price: 599.00, desc: "Envío Express (1-3 días). 18 tonos altamente pigmentados.", ticketReward: 5, category: "premium", images: ["https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500"], rating: "⭐⭐⭐⭐⭐ (4.8)" }
];

const defaultBudget = [
    { id: 4, title: "Mini Aspiradora de Mano USB", price: 89.00, desc: "Importación Directa (15-25 días). Ideal para limpiar esquinas difíciles.", ticketReward: 1, category: "budget", images: ["https://images.unsplash.com/photo-1563161431-e4199c5c9911?w=500"], rating: "⭐⭐⭐⭐ (4.5)" }
];

let premiumProducts = JSON.parse(localStorage.getItem('premiumProducts')) || defaultPremium;
let budgetProducts = JSON.parse(localStorage.getItem('budgetProducts')) || defaultBudget;
let allProducts = [...premiumProducts, ...budgetProducts];

let walletBalance = parseFloat(localStorage.getItem('walletBalance')) || 0.00;
let luckyTickets = parseInt(localStorage.getItem('luckyTickets')) || 0;
let isSpinning = false;
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let userPreferences = JSON.parse(localStorage.getItem('userPreferences')) || { premium: 0, budget: 0 };

let transactionHistory = JSON.parse(localStorage.getItem('transactionHistory')) || [
    { fecha: "Reciente", tipo: "Sistema", detalle: "Bienvenido a tu Cartera Épica", monto: 0, icono: "🎉" }
];

let currentImagesList = [];
let currentImageIndex = 0;
let isAdminModeActive = false;

function saveToDatabase() {
    localStorage.setItem('walletBalance', walletBalance);
    localStorage.setItem('luckyTickets', luckyTickets);
    localStorage.setItem('cart', JSON.stringify(cart));
    localStorage.setItem('userPreferences', JSON.stringify(userPreferences));
    localStorage.setItem('premiumProducts', JSON.stringify(premiumProducts));
    localStorage.setItem('budgetProducts', JSON.stringify(budgetProducts));
    localStorage.setItem('transactionHistory', JSON.stringify(transactionHistory));
}

// ==========================================
// RENDERIZADO PRINCIPAL Y FILTRADO
// ==========================================
function renderProducts() {
    const premiumGrid = document.getElementById('premium-grid');
    const budgetGrid = document.getElementById('budget-grid');
    const mainContainer = document.querySelector('.main-container');
    
    if(!premiumGrid || !budgetGrid) return;
    premiumGrid.innerHTML = '';
    budgetGrid.innerHTML = '';

    const searchQuery = document.getElementById('store-search-input') ? document.getElementById('store-search-input').value.toLowerCase().trim() : "";
    const priceOrder = document.getElementById('filter-price-order') ? document.getElementById('filter-price-order').value : "default";

    if (userPreferences.budget > userPreferences.premium + 5) {
        const budgetSection = document.querySelector('.budget-section');
        if(budgetSection && mainContainer) mainContainer.insertBefore(budgetSection, document.querySelector('.premium-section'));
    } else {
        const premiumSection = document.querySelector('.premium-section');
        if(premiumSection && mainContainer) mainContainer.insertBefore(premiumSection, document.querySelector('.budget-section'));
    }

    let filteredPremium = premiumProducts.filter(p => p.title.toLowerCase().includes(searchQuery) || p.desc.toLowerCase().includes(searchQuery));
    let filteredBudget = budgetProducts.filter(p => p.title.toLowerCase().includes(searchQuery) || p.desc.toLowerCase().includes(searchQuery));

    if (priceOrder === "low-high") {
        filteredPremium.sort((a, b) => a.price - b.price);
        filteredBudget.sort((a, b) => a.price - b.price);
    } else if (priceOrder === "high-low") {
        filteredPremium.sort((a, b) => b.price - a.price);
        filteredBudget.sort((a, b) => b.price - a.price);
    }

    // Renderizar Premium (Contra entrega / Rápido)
    filteredPremium.forEach(prod => {
        const imgSrc = prod.images && prod.images[0] ? prod.images[0] : "";
        const imgContent = imgSrc.startsWith('http') 
            ? `<img src="${imgSrc}" onerror="this.onerror=null; this.parentElement.innerHTML='📦'; this.parentElement.style.backgroundColor='#ffeaa7'; this.parentElement.style.color='#ffa502';" style="width:100%; height:100%; object-fit:cover;">` 
            : '📦';
        const imgStyle = imgSrc.startsWith('http') ? "padding:0; overflow:hidden;" : `background-color: #ffeaa7; color: #ffa502;`;

        premiumGrid.innerHTML += `
            <div class="product-card premium-card" onclick="openProductDetail(${prod.id})">
                <div class="product-img-placeholder" style="${imgStyle}">${imgContent}</div>
                <div class="badge-delivery" style="background:#ffa502; color:white; font-size:0.75rem; padding:2px 6px; border-radius:4px; width:fit-content; margin-bottom:5px; font-weight:bold;">⚡ Envío Rápido + Contra Entrega</div>
                <h3 class="product-title">${prod.title}</h3>
                <p class="product-price">$${prod.price.toFixed(2)}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <p style="color: #ffa502; font-size: 0.85rem; font-weight: bold;">🎁 +${prod.ticketReward} Boletos</p>
                    <button class="btn-buy" id="buy-btn-${prod.id}" style="width:auto; padding: 5px 10px; transition: all 0.3s;" onclick="addToCart(${prod.id}, '${prod.category}', event)">🛒</button>
                </div>
            </div>
        `;
    });

    // Renderizar Económicos (Anticipado / Lento)
    filteredBudget.forEach(prod => {
        const imgSrc = prod.images && prod.images[0] ? prod.images[0] : "";
        const imgContent = imgSrc.startsWith('http') 
            ? `<img src="${imgSrc}" onerror="this.onerror=null; this.parentElement.innerHTML='📦'; this.parentElement.style.backgroundColor='#74b9ff'; this.parentElement.style.color='#1e90ff';" style="width:100%; height:100%; object-fit:cover;">` 
            : '📦';
        const imgStyle = imgSrc.startsWith('http') ? "padding:0; overflow:hidden;" : `background-color: #74b9ff; color: #1e90ff;`;

        budgetGrid.innerHTML += `
            <div class="product-card budget-card" onclick="openProductDetail(${prod.id})">
                <div class="product-img-placeholder" style="${imgStyle}">${imgContent}</div>
                <div class="badge-delivery" style="background:#1e90ff; color:white; font-size:0.75rem; padding:2px 6px; border-radius:4px; width:fit-content; margin-bottom:5px; font-weight:bold;">🌍 Importación Económica (Pago Anticipado)</div>
                <h3 class="product-title">${prod.title}</h3>
                <p class="product-price">$${prod.price.toFixed(2)}</p>
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                    <p style="color: #1e90ff; font-size: 0.85rem; font-weight: bold;">🎁 +${prod.ticketReward} Boleto</p>
                    <button class="btn-buy" id="buy-btn-${prod.id}" style="width:auto; padding: 5px 10px; transition: all 0.3s;" onclick="addToCart(${prod.id}, '${prod.category}', event)">🛒</button>
                </div>
            </div>
        `;
    });
}

window.filterStoreProducts = function() {
    renderProducts();
};

window.trackInterest = function(category, points) {
    if(userPreferences[category] !== undefined) {
        userPreferences[category] += points;
        saveToDatabase();
    }
};

function updateWalletUI() {
    const walletBalanceSpan = document.getElementById('wallet-balance');
    const ticketsCountSpan = document.getElementById('tickets-count');
    const cartBadge = document.getElementById('cart-badge');
    
    if(walletBalanceSpan) walletBalanceSpan.innerText = `$${walletBalance.toFixed(2)}`;
    if(ticketsCountSpan) ticketsCountSpan.innerText = luckyTickets;
    if(cartBadge) cartBadge.innerText = cart.length;

    if (isAdminModeActive) {
        renderAdminTable();
    }
    renderHistoryItems(); 
}

// ==========================================
// VISTA DETALLE Y CARRUSEL
// ==========================================
window.openProductDetail = function(id) {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;

    trackInterest(prod.category, 2);

    document.getElementById('detail-title').innerText = prod.title;
    document.getElementById('detail-price').innerText = `$${prod.price.toFixed(2)}`;
    document.getElementById('detail-desc').innerText = prod.desc;
    document.getElementById('detail-rating').innerText = prod.rating || "⭐⭐⭐⭐⭐ (5.0)";
    document.getElementById('detail-reward').innerText = `🎁 Regala: ${prod.ticketReward} Boletos Gacha`;

    const addBtn = document.getElementById('detail-add-btn');
    addBtn.onclick = function(e) { 
        addToCart(prod.id, prod.category, e); 
    };

    currentImagesList = prod.images && prod.images.length > 0 ? prod.images : ["#ff4757"];
    currentImageIndex = 0;
    updateCarouselUI();

    renderSimilarProducts(prod.category, prod.id);
    document.getElementById('product-detail-modal').style.display = 'flex';
};

window.closeProductDetail = function() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) modal.style.display = 'none';
};

function updateCarouselUI() {
    const view = document.getElementById('carousel-main-view');
    const indexLabel = document.getElementById('carousel-index');
    if(!view || !indexLabel) return;
    
    const currentImg = currentImagesList[currentImageIndex];
    if (currentImg && (currentImg.startsWith('http://') || currentImg.startsWith('https://'))) {
        view.style.backgroundImage = `url('${currentImg}')`;
        view.style.backgroundColor = "transparent";
        view.innerHTML = "";
    } else {
        view.style.backgroundImage = "none";
        view.style.backgroundColor = currentImg || "#ff4757";
        view.innerHTML = `📸 Color de Simulación`;
    }
    indexLabel.innerText = `${currentImageIndex + 1} / ${currentImagesList.length}`;
}

window.changeCarouselImage = function(direction) {
    currentImageIndex += direction;
    if (currentImageIndex < 0) currentImageIndex = currentImagesList.length - 1;
    if (currentImageIndex >= currentImagesList.length) currentImageIndex = 0;
    updateCarouselUI();
};

function renderSimilarProducts(category, currentId) {
    const grid = document.getElementById('similar-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const filtered = allProducts.filter(p => p.category === category && p.id !== currentId);
    filtered.forEach(prod => {
        const imgStyle = prod.images && prod.images[0] ? `background-image: url('${prod.images[0]}');` : `background-color:#ff4757;`;
        grid.innerHTML += `
            <div class="product-card" style="padding:10px; font-size:0.9rem;" onclick="openProductDetail(${prod.id})">
                <div class="product-img-placeholder" style="height:80px; ${imgStyle}"></div>
                <h4 class="product-title" style="font-size:0.85rem; margin:5px 0;">${prod.title}</h4>
                <p class="product-price" style="font-size:0.95rem; margin-bottom:5px;">$${prod.price.toFixed(2)}</p>
            </div>
        `;
    });
}

// ==========================================
// SISTEMA DE ADMINISTRACIÓN COMPLETO (CMS)
// ==========================================
window.openAdminPanel = function() {
    const password = prompt("🔐 Introduce la contraseña secreta de administrador:");
    if (password === "admin123") {
        isAdminModeActive = true;
        document.getElementById('admin-panel').style.display = 'block';
        renderAdminTable();
        renderAdminInventoryManager();
        renderHistoryItems();
        alert("¡Acceso concedido! Panel de control listo.");
    } else {
        alert("❌ Contraseña incorrecta.");
    }
};

window.closeAdminPanel = function() {
    isAdminModeActive = false;
    document.getElementById('admin-panel').style.display = 'none';
};

window.createNewProduct = function(event) {
    event.preventDefault();
    
    const title = document.getElementById('new-title').value;
    const price = parseFloat(document.getElementById('new-price').value);
    const desc = document.getElementById('new-desc').value;
    const tickets = parseInt(document.getElementById('new-tickets').value);
    const category = document.getElementById('new-category').value;
    const imagesInput = document.getElementById('new-images').value;
    
    let imagesList = [];
    if (imagesInput.trim() !== "") {
        imagesList = imagesInput.split(',').map(url => url.trim());
    } else {
        imagesList = ["#ff4757", "#341f97"];
    }

    const newProduct = {
        id: Date.now(),
        title: title,
        price: price,
        desc: desc,
        ticketReward: tickets,
        category: category,
        images: imagesList,
        rating: "⭐⭐⭐⭐⭐ (5.0)"
    };

    if (category === 'premium') {
        premiumProducts.push(newProduct);
    } else {
        budgetProducts.push(newProduct);
    }

    syncAndRefresh();
    document.getElementById('add-product-form').reset();
    alert(`🎉 ¡Éxito! "${title}" fue añadido al catálogo.`);
};

window.modifyProductField = function(id, field) {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) return;

    let currentValue = prod[field];
    if (Array.isArray(currentValue)) currentValue = currentValue.join(', ');

    let newValue = prompt(`Editar ${field.toUpperCase()} para "${prod.title}":`, currentValue);
    if (newValue === null || newValue.trim() === "") return;

    if (field === 'price') {
        newValue = parseFloat(newValue);
        if (isNaN(newValue)) return alert("Introduce un número válido.");
    } else if (field === 'images') {
        newValue = newValue.split(',').map(url => url.trim());
    }

    let targetList = premiumProducts.find(p => p.id === id) ? premiumProducts : budgetProducts;
    let index = targetList.findIndex(p => p.id === id);
    if(index !== -1) {
        targetList[index][field] = newValue;
    }

    syncAndRefresh();
    alert("¡Inventario actualizado con éxito!");
};

window.deleteProduct = function(id) {
    if(!confirm("⚠️ ¿Estás seguro de que deseas eliminar este producto?")) return;

    premiumProducts = premiumProducts.filter(p => p.id !== id);
    budgetProducts = budgetProducts.filter(p => p.id !== id);

    syncAndRefresh();
    alert("Producto borrado del sistema.");
};

function syncAndRefresh() {
    allProducts = [...premiumProducts, ...budgetProducts];
    saveToDatabase();
    renderProducts();
    if(isAdminModeActive) renderAdminInventoryManager();
}

function renderAdminInventoryManager() {
    const listContainer = document.getElementById('admin-inventory-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    allProducts.forEach(prod => {
        listContainer.innerHTML += `
            <div style="background: #2f3542; padding: 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <span style="font-size: 0.85rem; color: #fff;">
                    <strong>[${prod.category.toUpperCase()}]</strong> ${prod.title} - <span style="color:#2ed573;">$${prod.price.toFixed(2)}</span>
                </span>
                <div style="display:flex; gap: 5px; flex-wrap: wrap;">
                    <button onclick="modifyProductField(${prod.id}, 'title')" style="background:#ffa502; border:none; padding:5px 8px; border-radius:4px; color:white; cursor:pointer; font-size:0.75rem;">Nombre ✏️</button>
                    <button onclick="modifyProductField(${prod.id}, 'price')" style="background:#1e90ff; border:none; padding:5px 8px; border-radius:4px; color:white; cursor:pointer; font-size:0.75rem;">Precio 💲</button>
                    <button onclick="modifyProductField(${prod.id}, 'desc')" style="background:#a4b0be; border:none; padding:5px 8px; border-radius:4px; color:white; cursor:pointer; font-size:0.75rem;">Descripción 📝</button>
                    <button onclick="modifyProductField(${prod.id}, 'images')" style="background:#9b59b6; border:none; padding:5px 8px; border-radius:4px; color:white; cursor:pointer; font-size:0.75rem;">Fotos 📸</button>
                    <button onclick="deleteProduct(${prod.id})" style="background:#ff4757; border:none; padding:5px 8px; border-radius:4px; color:white; cursor:pointer; font-size:0.75rem;">Eliminar 🗑️</button>
                </div>
            </div>
        `;
    });
}

function renderAdminTable() {
    const tableBody = document.getElementById('admin-users-table');
    const totalLiquidityDisplay = document.getElementById('admin-total-liquidity');
    if (!tableBody) return;
    
    const mockUsers = [
        { id: "Cliente_01 (Tú)", wallet: walletBalance, tickets: luckyTickets }
    ];

    let totalDestinedMoney = mockUsers.reduce((sum, user) => sum + user.wallet, 0);
    if (totalLiquidityDisplay) {
        totalLiquidityDisplay.innerText = `$${totalDestinedMoney.toFixed(2)}`;
    }

    tableBody.innerHTML = '';
    mockUsers.forEach(user => {
        tableBody.innerHTML += `
            <tr style="border-bottom: 1px solid #2f3542;">
                <td style="padding: 10px; color: #fff;">${user.id}</td>
                <td style="padding: 10px; color: #2ed573; font-weight:bold;">$${user.wallet.toFixed(2)}</td>
                <td style="padding: 10px;">🎫 ${user.tickets}</td>
            </tr>
        `;
    });
}

// ==========================================
// CONTROL DEL CARRITO E INTELIGENCIA LOGÍSTICA
// ==========================================
window.toggleCartModal = function() {
    const modal = document.getElementById('cart-modal');
    if (modal && modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else if(modal) {
        modal.style.display = 'flex';
        renderCartItems();
    }
};

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const totalDisplay = document.getElementById('cart-total-price');
    if (!container || !totalDisplay) return;

    if (cart.length === 0) {
        container.innerHTML = `<p style="color: #a4b0be; text-align: center; padding: 20px;">Tu carrito está vacío.</p>`;
        totalDisplay.innerText = "$0.00";
        return;
    }

    container.innerHTML = '';
    let total = 0;

    cart.forEach((prod, index) => {
        total += prod.price;
        const deliveryType = prod.category === 'premium' ? '⚡ Contra Entrega' : '🌍 Importación';
        container.innerHTML += `
            <div style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #f1f2f6; color: #2f3542;">
                <div>
                    <span style="font-weight:bold;">${prod.title}</span> <small style="color:#747d8c;">(${deliveryType})</small><br>
                    <small style="color: #ffa502; font-weight:bold;">🎫 +${prod.ticketReward} Boletos</small>
                </div>
                <div style="display: flex; gap: 15px; align-items: center;">
                    <span style="font-weight:bold; color:#2ed573;">$${prod.price.toFixed(2)}</span>
                    <button style="background: none; border: none; color: #ff4757; cursor: pointer; font-weight: bold; font-size:1.2rem;" onclick="removeFromCart(${index}, event)">&times;</button>
                </div>
            </div>
        `;
    });

    totalDisplay.innerText = `$${total.toFixed(2)}`;
}

window.addToCart = function(id, type, event) {
    if (event) event.stopPropagation();
    const prod = allProducts.find(p => p.id === id);
    if(!prod) return;
    
    cart.push(prod);
    trackInterest(type || prod.category, 3);
    saveToDatabase();
    updateWalletUI();

    const btn = document.getElementById(`buy-btn-${id}`);
    if (btn) {
        const originalContent = btn.innerHTML;
        btn.innerHTML = "¡Añadido! ✓";
        btn.style.background = "#2ed573";
        btn.style.color = "white";
        btn.disabled = true;

        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.style.background = "";
            btn.style.color = "";
            btn.disabled = false;
        }, 1200);
    }
};

window.removeFromCart = function(index, event) {
    if (event) event.stopPropagation();
    cart.splice(index, 1);
    saveToDatabase();
    updateWalletUI();
    renderCartItems();
};

// Variable temporal para mantener el mensaje listo durante el pago con tarjeta
let pendingWhatsAppMessage = "";

window.checkoutCart = function() {
    if(cart.length === 0) return;
    
    // 1. Validar campos del formulario de envío
    const name = document.getElementById('ship-name').value.trim();
    const phone = document.getElementById('ship-phone').value.trim();
    const address = document.getElementById('ship-address').value.trim();
    const city = document.getElementById('ship-city').value.trim();

    if(!name || !phone || !address || !city) {
        alert("⚠️ Por favor, completa todos los datos de entrega antes de proceder.");
        return;
    }

    // 2. Analizar tipos de productos en el carrito
    const hasPremium = cart.some(item => item.category === 'premium');
    const hasBudget = cart.some(item => item.category === 'budget');
    let total = cart.reduce((sum, item) => sum + item.price, 0);

    // 3. Construir mensaje base estructurado para WhatsApp
    let clientMessage = `¡Hola! Vengo de la tienda y quiero confirmar mi pedido:\n\n`;
    clientMessage += `👤 *Cliente:* ${name}\n`;
    clientMessage += `📞 *Teléfono:* ${phone}\n`;
    clientMessage += `📍 *Dirección:* ${address}, ${city}\n\n`;
    clientMessage += `🛒 *Detalle de la compra:*\n`;

    cart.forEach(item => {
        const tagType = item.category === 'premium' ? '[⚡ PREMIUM COD]' : '[🌍 IMPORTACIÓN]';
        clientMessage += `- ${item.title} ${tagType} ($${item.price.toFixed(2)})\n`;
    });
    
    clientMessage += `\n💰 *Total a pagar:* $${total.toFixed(2)}\n`;

    // 4. Procesar según fondos o tipo de logística
    if (walletBalance >= total) {
        walletBalance -= total;
        addTransaction("Compra", `Pagado con cartera: ${cart.length} productos`, -total, "🛍️");
        cart.forEach(item => luckyTickets += item.ticketReward);
        cart = [];
        
        clientMessage += `\n💳 *Estado del pago:* Pagado por Adelantado vía Cartera Virtual.`;
        alert(`🎉 ¡COMPRA PROCESADA!\nTe redirigiremos a WhatsApp para agendar tu entrega.`);
        finalizeCheckoutFlow(clientMessage);
    } else {
        // SI TIENE ARTÍCULOS DE IMPORTACIÓN Y NO HAY SALDO, ABRIMOS LA PASARELA
        if (hasBudget) {
            pendingWhatsAppMessage = clientMessage + `\n💳 *Estado del pago:* Liquidado de forma segura con Tarjeta Bancaria (Simulada).`;
            document.getElementById('gate-total-price').innerText = `$${total.toFixed(2)}`;
            toggleCartModal(); // Cerramos carrito
            document.getElementById('payment-gate-modal').style.display = 'flex'; // Abrimos pasarela
            return;
        }
        
        // Pedidos puramente Premium sin fondos pasan directo como Contra Entrega
        addTransaction("Pedido COD", `Pendiente Contra Entrega: ${cart.length} productos`, 0, "📦");
        cart.forEach(item => luckyTickets += item.ticketReward);
        cart = [];

        clientMessage += `\n📦 *Método de Pago:* Pago en Efectivo Contra Entrega al recibir.`;
        alert(`📦 ¡Pedido Generado con éxito!\nTe enviaremos a WhatsApp para validar tus datos de entrega.`);
        finalizeCheckoutFlow(clientMessage);
    }
};

// FUNCIONES COMPLEMENTARIAS PARA LA PASARELA DE PAGO
window.closePaymentGate = function() {
    document.getElementById('payment-gate-modal').style.display = 'none';
    // Limpiar inputs de la pasarela
    document.getElementById('card-number').value = "";
    document.getElementById('card-expiry').value = "";
    document.getElementById('card-cvc').value = "";
};

window.processGatePayment = function() {
    const card = document.getElementById('card-number').value.trim();
    const expiry = document.getElementById('card-expiry').value.trim();
    const cvc = document.getElementById('card-cvc').value.trim();

    if (card.length < 16 || expiry.length < 5 || cvc.length < 3) {
        alert("❌ Datos de tarjeta inválidos o incompletos. Inténtalo de nuevo.");
        return;
    }

    const payBtn = document.getElementById('btn-gate-pay');
    payBtn.disabled = true;
    payBtn.innerText = "🔒 Encriptando conexión y procesando...";
    payBtn.style.background = "#ffa502";

    // Simular retraso de pasarela bancaria (3 segundos de tensión)
    setTimeout(() => {
        let total = cart.reduce((sum, item) => sum + item.price, 0);
        
        // Registrar la transacción bancaria simulada
        addTransaction("Pago Tarjeta", `Aprobado por pasarela bancaria`, -total, "💳");
        
        // Añadir recompensas de boletos gacha ganados
        cart.forEach(item => luckyTickets += item.ticketReward);
        cart = []; // Limpiamos el carrito completamente

        alert("💳 ¡PAGO APROBADO CON ÉXITO VIA PASARELA ENCRIPTADA!\nRedirigiendo a tu orden oficial...");
        
        // Reestablecer botón e interfaz
        payBtn.disabled = false;
        payBtn.innerText = "Procesar Pago Simulado de Importación 💳";
        payBtn.style.background = "#2ed573";
        
        closePaymentGate();
        finalizeCheckoutFlow(pendingWhatsAppMessage);
    }, 3000);
};

// Encapsulación del cierre de base de datos y envío a WhatsApp
function finalizeCheckoutFlow(message) {
    saveToDatabase();
    updateWalletUI();
    
    document.getElementById('ship-name').value = "";
    document.getElementById('ship-phone').value = "";
    document.getElementById('ship-address').value = "";
    document.getElementById('ship-city').value = "";

    const myBusinessPhone = "7841014335"; 
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${myBusinessPhone}?text=${encodedMessage}`, '_blank');
}

// ==========================================
// RECOMPENSAS Y RULETA GACHA
// ==========================================
if(document.getElementById('btn-ad')) {
    document.getElementById('btn-ad').onclick = function() {
        alert("Comercial en reproducción...");
        setTimeout(() => {
            luckyTickets += 1;
            saveToDatabase();
            updateWalletUI();
            alert("¡Felicidades! Ganaste 1 Ticket.");
        }, 1000); 
    };
}

if(document.getElementById('btn-spin')) {
    document.getElementById('btn-spin').onclick = function() {
        if (luckyTickets <= 0 || isSpinning) return alert("¡No tienes boletos suficientes!");

        isSpinning = true;
        luckyTickets--;
        saveToDatabase();
        updateWalletUI();

        const wheel = document.getElementById('wheel');
        
        const premiosComprador = [
            { premio: 15.00, label: "¡PREMIO MAYOR!" },
            { premio: 10.00, label: "¡Nivel Épico!" },
            { premio: 5.00, label: "¡Gran Cashback!" },
            { premio: 3.00, label: "¡Premio Básico!" },
            { premio: 0.00, label: "Sigue participando" }
        ];

        const indexPremio = Math.floor(Math.random() * premiosComprador.length);
        const resultado = premiosComprador[indexPremio];
        
        const gradosPorSegmento = 360 / premiosComprador.length; 
        const anguloDestino = 360 - (indexPremio * gradosPorSegmento);
        const vueltasCompletas = 1440; 
        const anguloFinal = vueltasCompletas + anguloDestino; 

        if(wheel) {
            wheel.style.transform = `rotate(${anguloFinal}deg)`;
        }

        setTimeout(() => {
            isSpinning = false;
            if (resultado.premio > 0) {
                walletBalance += resultado.premio;
                addTransaction("Gacha", `Ganaste en Ruleta: ${resultado.label}`, resultado.premio, "🎰");
                alert(`🎰 ¡RULETA DETENIDA!\n${resultado.label}\nRecompensa de Cashback: +$${resultado.premio.toFixed(2)}`);
            } else {
                addTransaction("Gacha", "Giraste la ruleta: Mala suerte", 0, "❌");
                alert(`🎰 Suerte para la próxima.`);
            }
            saveToDatabase();
            updateWalletUI();
        }, 4000); 
    };
}

window.addTransaction = function(tipo, detalle, monto, icono) {
    const ahora = new Date();
    const tiempoEstampa = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
    
    transactionHistory.unshift({
        fecha: tiempoEstampa,
        tipo: tipo,
        detalle: detalle,
        monto: monto,
        icono: icono
    });
    
    if(transactionHistory.length > 20) transactionHistory.pop();
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
    const adminLogsContainer = document.getElementById('admin-live-logs');
    if (!container) return;
    
    if (transactionHistory.length === 0) {
        container.innerHTML = `<p style="color: #a4b0be; text-align: center;">No hay movimientos.</p>`;
        if (adminLogsContainer) adminLogsContainer.innerHTML = `[SISTEMA]: Sin operaciones hoy.`;
        return;
    }
    
    container.innerHTML = '';
    if (adminLogsContainer) adminLogsContainer.innerHTML = ''; 

    transactionHistory.forEach(item => {
        const colorMonto = item.monto > 0 ? '#2ed573' : (item.monto < 0 ? '#ff4757' : '#a4b0be');
        const signo = item.monto > 0 ? '+' : '';
        
        container.innerHTML += `
            <div style="background: #2f3542; padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; border-left: 4px solid ${colorMonto}; color: white;">
                <div>
                    <span style="font-size: 1rem;">${item.icono} <strong>${item.detalle}</strong></span><br>
                    <small style="color: #a4b0be;">${item.fecha} | ${item.tipo}</small>
                </div>
                <span style="color: ${colorMonto}; font-weight: bold; font-size: 1.1rem;">
                    ${item.monto !== 0 ? signo + '$' + item.monto.toFixed(2) : '---'}
                </span>
            </div>
        `;

        if (adminLogsContainer) {
            adminLogsContainer.innerHTML += `
                <div style="margin-bottom: 4px; border-bottom: 1px dashed #2f3542; padding-bottom: 4px; color:#2ed573;">
                    [${item.fecha}] - LOG_${item.tipo.toUpperCase()}: ${item.detalle} (${item.monto !== 0 ? signo + '$' + item.monto.toFixed(2) : 'COD'})
                </div>
            `;
        }
    });
}

// Inicialización de la app limpia y segura
document.addEventListener("DOMContentLoaded", () => {
    renderProducts();
    updateWalletUI();
});