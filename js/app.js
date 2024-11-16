// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBHUQzQCC6LGbBUQ5OHQ6MDT5RxRdf4lwo", // Replace with your Firebase API Key
    authDomain: "register-43352.firebaseapp.com",
    projectId: "register-43352",
    storageBucket: "register-43352.firebasestorage.app",
    messagingSenderId: "445968342971",
    appId: "1:445968342971:web:e99f9fd777e5669979ee9e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const authSection = document.getElementById('auth');
const adminPanel = document.getElementById('admin-panel');
const productList = document.getElementById('product-list');
const scannerSection = document.getElementById('scanner');
const guideModal = document.getElementById('guide-modal');
const guideContent = document.getElementById('guide-content');
const categoriesList = document.getElementById('categories-list');

// Authentication
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.username.value;
    const password = e.target.password.value;
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            const user = userCredential.user;
            loadUserRole(user);
        })
        .catch(error => {
            alert(error.message);
        });
});

// Load User Role and UI
function loadUserRole(user) {
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            const role = doc.data().role;
            showSectionBasedOnRole(role);
            showGuide(role, doc.data());
        } else {
            alert("User data not found!");
            auth.signOut();
        }
    });
}

// Show/Hide Sections Based on Role
function showSectionBasedOnRole(role) {
    authSection.classList.add('hidden');
    productList.classList.remove('hidden');
    scannerSection.classList.remove('hidden');

    if (role === 'Owner' || role === 'Manager') {
        adminPanel.classList.remove('hidden');
        loadCategories();
    }
    loadProducts();
}

// Create User
document.getElementById('create-user-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target['new-username'].value;
    const password = e.target['new-password'].value;
    const role = e.target['role'].value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            db.collection('users').doc(userCredential.user.uid).set({
                role: role,
                showGuide: true
            });
            alert('User created successfully');
            e.target.reset();
        })
        .catch(error => {
            alert(error.message);
        });
});

// Create Category
document.getElementById('create-category-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const categoryName = e.target['category-name'].value;

    db.collection('categories').add({
        name: categoryName
    }).then(() => {
        alert('Category created successfully');
        e.target.reset();
        loadCategories();
    }).catch(error => {
        alert(error.message);
    });
});

// Load Categories
function loadCategories() {
    categoriesList.innerHTML = '';
    db.collection('categories').get().then(snapshot => {
        snapshot.forEach(doc => {
            const category = doc.data();
            const div = document.createElement('div');
            div.classList.add('category-item');
            div.innerHTML = `
                <span>${category.name}</span>
                <button data-id="${doc.id}" class="delete-category">Delete</button>
            `;
            categoriesList.appendChild(div);
        });
        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-category').forEach(button => {
            button.addEventListener('click', deleteCategory);
        });
    });
}

// Delete Category
function deleteCategory(e) {
    const categoryId = e.target.getAttribute('data-id');
    db.collection('categories').doc(categoryId).delete()
        .then(() => {
            alert('Category deleted successfully');
            loadCategories();
        })
        .catch(error => {
            alert(error.message);
        });
}

// Load Products
function loadProducts() {
    db.collection('products').onSnapshot(snapshot => {
        productList.querySelector('#products').innerHTML = '';
        snapshot.forEach(doc => {
            const product = doc.data();
            const div = document.createElement('div');
            div.classList.add('product');
            div.innerHTML = `
                <img src="${product.photoURL || 'images/default.png'}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p data-i18n="price">Price:</p> $${product.price}
                <p data-i18n="quantity">Quantity:</p> ${product.quantity}
            `;
            productList.querySelector('#products').appendChild(div);
        });
    });
}

// Start Barcode Scan
document.getElementById('start-scan').addEventListener('click', () => {
    Quagga.init({
        inputStream: {
            type: "LiveStream",
            target: document.getElementById('scanner-video'),
            constraints: {
                facingMode: "environment"
            }
        },
        decoder: {
            readers: ["ean_reader", "code_128_reader", "ean_8_reader", "upc_reader"]
        }
    }, function(err) {
        if (err) {
            console.error(err);
            alert('Error starting scanner');
            return;
        }
        Quagga.start();
    });

    Quagga.onDetected(handleDetected);
});

// Handle Detected Barcode
function handleDetected(data) {
    const code = data.codeResult.code;
    Quagga.offDetected(handleDetected);
    Quagga.stop();
    fetchProductByBarcode(code);
}

// Fetch Product by Barcode
function fetchProductByBarcode(barcode) {
    db.collection('products').where('barcode', '==', barcode).get()
        .then(snapshot => {
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const product = doc.data();
                    alert(`Product: ${product.name}\nPrice: $${product.price}`);
                    // Decrease quantity logic
                    if (product.quantity > 0) {
                        db.collection('products').doc(doc.id).update({
                            quantity: product.quantity - 1
                        });
                    } else {
                        alert('Product out of stock');
                    }
                });
            } else {
                // If product not found, prompt to add manually
                const name = prompt('Product not found. Enter product name:');
                const price = parseFloat(prompt('Enter product price:'));
                const category = prompt('Enter product category:');
                const photoURL = prompt('Enter image URL:') || 'images/default.png';
                db.collection('products').add({
                    barcode: barcode,
                    name: name,
                    price: price,
                    quantity: 1,
                    category: category,
                    photoURL: photoURL
                }).then(() => {
                    alert('Product added successfully');
                }).catch(error => {
                    alert(error.message);
                });
            }
        })
        .catch(error => {
            alert(error.message);
        });
}

// Localization Setup
i18next.use(i18nextBrowserLanguageDetector).init({
    fallbackLng: 'en',
    resources: {
        en: {
            translation: {
                "login": "Login",
                "admin_panel": "Admin Panel",
                "create_user": "Create User",
                "select_role": "Select Role",
                "manager": "Manager",
                "head_cashier": "Head Cashier",
                "cashier": "Cashier",
                "create": "Create",
                "manage_categories": "Manage Categories",
                "category_name": "Category Name",
                "products": "Products",
                "barcode_scanner": "Barcode Scanner",
                "start_scan": "Start Scan",
                "price": "Price:",
                "quantity": "Quantity:",
                "guide": "Guide",
                "never_show": "Never show again",
                "close": "Close"
            }
        },
        ar: {
            translation: {
                "login": "تسجيل الدخول",
                "admin_panel": "لوحة الإدارة",
                "create_user": "إنشاء مستخدم",
                "select_role": "اختر الدور",
                "manager": "مدير",
                "head_cashier": "رئيس أمين الصندوق",
                "cashier": "أمين الصندوق",
                "create": "إنشاء",
                "manage_categories": "إدارة الفئات",
                "category_name": "اسم الفئة",
                "products": "المنتجات",
                "barcode_scanner": "ماسح الباركود",
                "start_scan": "ابدأ المسح",
                "price": "السعر:",
                "quantity": "الكمية:",
                "guide": "الدليل",
                "never_show": "لا تظهر مرة أخرى",
                "close": "إغلاق"
            }
        }
    }
}, function(err, t) {
    updateContent();
});

// Update Content Based on Language
function updateContent() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.innerHTML = i18next.t(key);
    });
}

// Set Language Function
function setLanguage(lang) {
    i18next.changeLanguage(lang, () => {
        updateContent();
    });
}

// User Guide Logic
function showGuide(role, userData) {
    if (userData.showGuide) {
        guideContent.innerText = getGuideContent(role);
        guideModal.classList.remove('hidden');
    }
}

function getGuideContent(role) {
    switch(role) {
        case 'Owner':
            return "Welcome, Owner! You have full access to all features, including user and category management.";
        case 'Manager':
            return "Welcome, Manager! You can manage users and categories, and oversee store operations.";
        case 'HeadCashier':
            return "Welcome, Head Cashier! You can handle transactions and assist in managing cashiers.";
        case 'Cashier':
            return "Welcome, Cashier! You can process sales and handle customer transactions.";
        default:
            return "";
    }
}

function closeGuide() {
    const neverShow = document.getElementById('never-show').checked;
    const user = auth.currentUser;
    if (neverShow && user) {
        db.collection('users').doc(user.uid).update({ showGuide: false });
    }
    guideModal.classList.add('hidden');
}

// Initialize Authentication State
auth.onAuthStateChanged(user => {
    if (user) {
        loadUserRole(user);
    } else {
        authSection.classList.remove('hidden');
        adminPanel.classList.add('hidden');
        productList.classList.add('hidden');
        scannerSection.classList.add('hidden');
        guideModal.classList.add('hidden'); // Hide the guide modal
    }
});
