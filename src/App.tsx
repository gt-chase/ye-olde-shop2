// @ts-nocheck

import { useState, useEffect } from 'react'
import './App.css'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

interface Product {
  id: number
  title: string
  price: number
  category: string
  image: string
  description: string
}

interface CartItem extends Product {
  quantity: number
}

interface ShippingInfo {
  firstName: string
  lastName: string
  email: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
}

interface PaymentInfo {
  cardNumber: string
  cardName: string
  expiry: string
  cvv: string
}

import ProvidenceAgent from 'agent';

const agent = new ProvidenceAgent({
  backendUrl: 'http://localhost:5001',
  projectID: 'cfc15e83-970b-42cd-989f-b87b785a1fd4',
  // debug: true,
  onEventRecorded: (event) => {
    // console.log('Event recorded:', event);
  },
});

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutStep, setCheckoutStep] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [categories, setCategories] = useState<string[]>([])
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({ firstName: '', lastName: '', email: '', address: '', city: '', state: '', zipCode: '', phone: '' })
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({ cardNumber: '', cardName: '', expiry: '', cvv: '' })
  const [orderProcessing, setOrderProcessing] = useState(false)
  const [finalTotal, setFinalTotal] = useState(0)


  useEffect(() => {
    const startRecording = () => {
      console.log('App loaded');
      agent.startRecord();
    };

    if (document.readyState === 'complete') {
      startRecording();
    } else {
      window.addEventListener('load', startRecording);
    }

    // Cleanup function
    return () => {
      window.removeEventListener('load', startRecording);
      agent.stopRecord();
    };
  }, []);

  useEffect(() => {
    fetch('https://fakestoreapi.com/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(() => toast.error('Failed to load products.'))
    
    fetch('https://fakestoreapi.com/products/categories')
      .then(res => res.json())
      .then(data => setCategories(['all', ...data]))
      .catch(() => toast.error('Failed to load categories.'))
  }, [])

  useEffect(() => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) setCart(JSON.parse(savedCart))
  }, [])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  const filteredProducts = selectedCategory === 'all' ? products : products.filter(product => product.category === selectedCategory)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const simulateAddToCartError = () => {
    if (Math.random() < 0.15) { // 15% chance of error
      // toast.error('Error: Unable to add item to cart');
      throw new Error('Add to Cart Failed');
    }
  }
  
  const addToCart = (product: Product) => {

    try {
      simulateAddToCartError();
      setCart(prevCart => {
        const existingItem = prevCart.find(item => item.id === product.id)
        if (existingItem) {
          const updatedCart = prevCart.map(item =>
            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
          )
          updateCartApi(updatedCart)
          return updatedCart
        } else {
          const newCart = [...prevCart, { ...product, quantity: 1 }]
          addNewItemToCartApi(product.id, 1) // Simulate network request to add item
          return newCart
        }
      });
      toast.success('Item added to cart!')
      } catch (error) { 
        console.error('Add to cart error:', error);
        toast.error('Error: Unable to add item to cart');
      } 
    }
  

  const removeFromCart = (productId: number) => {
    setCart(prevCart => {
      const item = prevCart.find(item => item.id === productId)
      if (item && item.quantity > 1) {
        const updatedCart = prevCart.map(cartItem =>
          cartItem.id === productId ? { ...cartItem, quantity: cartItem.quantity - 1 } : cartItem
        )
        updateCartApi(updatedCart)
        return updatedCart
      }
      const filteredCart = prevCart.filter(cartItem => cartItem.id !== productId)
      updateCartApi(filteredCart) // Simulate network request to update cart after removal
      return filteredCart
    })
    toast.info('Item removed from cart')
  }

  // Simulated API calls for cart updates
  const addNewItemToCartApi = (productId: number, quantity: number) => {
    fetch('https://fakestoreapi.com/carts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 1, // Dummy user ID for this example
        date: new Date().toISOString().split('T')[0],
        products: [{ productId, quantity }]
      })
    }).catch(() => toast.error('Failed to add item to cart.'))
  }

  const updateCartApi = (cartItems: CartItem[]) => {
    fetch('https://fakestoreapi.com/carts/1', { // Assuming cart ID 1 is the single cart used
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 1, // Dummy user ID for this example
        date: new Date().toISOString().split('T')[0],
        products: cartItems.map(item => ({ productId: item.id, quantity: item.quantity }))
      })
    }).catch(() => toast.error('Failed to update cart.'))
  }

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateShippingInfo()) setCheckoutStep(1)
    else toast.error('Please fill in all required fields')
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validatePaymentInfo()) {
      setOrderProcessing(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 2000))
        setFinalTotal(totalPrice)
        toast.success('Order placed successfully!')
        setCart([])
        setCheckoutStep(2)
      } catch (error) {
        toast.error('Error processing order')
      } finally {
        setOrderProcessing(false)
      }
    } else {
      toast.error('Please fill in all payment details')
    }
  }

  const validateShippingInfo = (): boolean => {
    const { firstName, lastName, email, address, city, state, zipCode, phone } = shippingInfo
    return !!(firstName && lastName && email && address && city && state && zipCode && phone)
  }

  const validatePaymentInfo = (): boolean => {
    const { cardNumber, cardName, expiry, cvv } = paymentInfo
    return !!(cardNumber && cardName && expiry && cvv)
  }
  const formatCardNumber = (value: string) => {
    return value
      .replace(/\s/g, '')
      .replace(/(\d{4})/g, '$1 ')
      .trim()
  }

  const formatExpiry = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d{0,2})/, '$1/$2')
  }

  const simulateCheckoutError = () => {
    if (Math.random() < 0.30) { // 30% chance of error
      toast.error('Error: Unable to proceed to checkout');
      throw new Error('Checkout Error');
    }
  }
  
  const checkout = () => {
    try{
      simulateCheckoutError();
      if (cart.length === 0) {
        toast.error('Your cart is empty!')
        return
      }
      setShowCheckout(true)
      setShowCart(false)
      setCheckoutStep(0)
      window.history.pushState({}, '') // Back button support
    } catch (error) {
      console.error('Checkout error:', error);
    }
  }

  useEffect(() => {
    const handlePopState = () => {
      if (showCheckout) setShowCheckout(false)
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [showCheckout])

  return (
    <div className="app">
      <header>
        <h1>Ye Olde Shop</h1>
        <div>
          <select onChange={(e) => setSelectedCategory(e.target.value)}>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          <button onClick={() => setShowCart(!showCart)}>Cart ({totalItems})</button>
        </div>
      </header>
      
      {!showCheckout ? (
        <>
          <div className="products">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card">
                <img src={product.image} alt={product.title} style={{ width: '150px', height: '150px', objectFit: 'cover' }} />
                <h4>{product.title}</h4>
                <p>${product.price}</p>
                <button onClick={() => addToCart(product)}>Add to Cart</button>
              </div>
            ))}
          </div>

          {showCart && (
            <div className="cart">
              <h2>Shopping Cart</h2>
              {cart.map(item => (
                <div key={item.id} className="cart-item">
                  <img src={item.image} alt={item.title} style={{ width: '50px', height: '50px' }} />
                  <h4>{item.title}</h4>
                  <p>Quantity: {item.quantity}</p>
                  <button onClick={() => removeFromCart(item.id)}>Remove</button>
                </div>
              ))}
              <h3>Total: ${totalPrice.toFixed(2)}</h3>
              <button onClick={checkout}>Checkout</button>
            </div>
          )}
        </>
      ) : (
        <div className="checkout-container">
  <div className="checkout-steps">
    {['Shipping', 'Payment', 'Confirmation'].map((step, index) => (
      <div 
        key={step} 
        className={`step ${index === checkoutStep ? 'active' : ''} ${index < checkoutStep ? 'completed' : ''}`}
      >
        <div className="step-number">{index < checkoutStep ? '✓' : index + 1}</div>
        <div className="step-title">{step}</div>
      </div>
    ))}
  </div>

  <div className="checkout-content">
    {checkoutStep === 0 && (
      <form onSubmit={handleShippingSubmit} className="checkout-form">
        <h3>Shipping Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              value={shippingInfo.firstName}
              onChange={e => setShippingInfo({ ...shippingInfo, firstName: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              value={shippingInfo.lastName}
              onChange={e => setShippingInfo({ ...shippingInfo, lastName: e.target.value })}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={shippingInfo.email}
            onChange={e => setShippingInfo({ ...shippingInfo, email: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            value={shippingInfo.phone}
            onChange={e => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input
            type="text"
            value={shippingInfo.address}
            onChange={e => setShippingInfo({ ...shippingInfo, address: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              value={shippingInfo.city}
              onChange={e => setShippingInfo({ ...shippingInfo, city: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              value={shippingInfo.state}
              onChange={e => setShippingInfo({ ...shippingInfo, state: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>ZIP Code</label>
            <input
              type="text"
              value={shippingInfo.zipCode}
              onChange={e => setShippingInfo({ ...shippingInfo, zipCode: e.target.value })}
              required
            />
          </div>
        </div>
        <button type="submit" className="checkout-button">Continue to Payment</button>
      </form>
    )}

    {checkoutStep === 1 && (
      <form onSubmit={handlePaymentSubmit} className="checkout-form">
        <h3>Payment Information</h3>
        <div className="form-group">
          <label>Card Number</label>
          <input
            type="text"
            value={paymentInfo.cardNumber}
            onChange={e => setPaymentInfo({ 
              ...paymentInfo, 
              cardNumber: formatCardNumber(e.target.value) 
            })}
            maxLength={19}
            placeholder="1234 5678 9012 3456"
            required
          />
        </div>
        <div className="form-group">
          <label>Cardholder Name</label>
          <input
            type="text"
            value={paymentInfo.cardName}
            onChange={e => setPaymentInfo({ ...paymentInfo, cardName: e.target.value })}
            required
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Expiry Date</label>
            <input
              type="text"
              value={paymentInfo.expiry}
              onChange={e => setPaymentInfo({ 
                ...paymentInfo, 
                expiry: formatExpiry(e.target.value) 
              })}
              maxLength={5}
              placeholder="MM/YY"
              required
            />
          </div>
          <div className="form-group">
            <label>CVV</label>
            <input
              type="password"
              value={paymentInfo.cvv}
              onChange={e => setPaymentInfo({ ...paymentInfo, cvv: e.target.value })}
              maxLength={4}
              required
            />
          </div>
        </div>
        <button 
          type="submit" 
          className="checkout-button"
          disabled={orderProcessing}
        >
          {orderProcessing ? 'Processing...' : 'Place Order'}
        </button>
      </form>
    )}

    {checkoutStep === 2 && (
      <div className="order-confirmation">
        <div className="success-animation">✓</div>
        <h3>Order Confirmed!</h3>
        <p>Thank you for your purchase.</p>
        <p>Order confirmation has been sent to: {shippingInfo.email}</p>
        <p>Total Amount: ${finalTotal.toFixed(2)}</p>
        <button 
          onClick={() => {
            setShowCheckout(false)
            setCheckoutStep(0)
          }}
          className="continue-shopping"
        >
          Continue Shopping
        </button>
      </div>
    )}
  </div>
  </div>

      )}

      <ToastContainer position="bottom-right" />
  </div>
  )
}
export default App
