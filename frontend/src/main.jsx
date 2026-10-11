import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Route, RouterProvider, createBrowserRouter, createRoutesFromElements } from 'react-router'
import './index.css'
import App from './App.jsx'
import store from './redux/store.js'
import RootLayout, { RouteError } from './layouts/RootLayout.jsx'
import { GuestOnly, RequireAdmin, RequireAuth } from './components/common/RouteGuards.jsx'
import { applyCachedTheme } from './utils/applyTheme.js'
import { ADMIN_BASE_PATH } from './redux/constant.js'

// Storefront pages
const Home = lazy(() => import('./pages/Home/Home.jsx'))
const Shop = lazy(() => import('./pages/Shop/Shop.jsx'))
const Categories = lazy(() => import('./pages/Category/Categories.jsx'))
const CategoryDetail = lazy(() => import('./pages/Category/CategoryDetail.jsx'))
const ProductDetails = lazy(() => import('./pages/ProductDetails/ProductDetails.jsx'))
const Search = lazy(() => import('./pages/Search/Search.jsx'))
const Cart = lazy(() => import('./pages/Cart/Cart.jsx'))
const Checkout = lazy(() => import('./pages/Checkout/Checkout.jsx'))
const Wishlist = lazy(() => import('./pages/Wishlist/Wishlist.jsx'))
const Contact = lazy(() => import('./pages/Contact/Contact.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

// Auth
const Login = lazy(() => import('./pages/Auth/Login.jsx'))
const Signup = lazy(() => import('./pages/Auth/Signup.jsx'))
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword.jsx'))
const ResetPassword = lazy(() => import('./pages/Auth/ResetPassword.jsx'))

// Customer account
const AccountLayout = lazy(() => import('./pages/Account/AccountLayout.jsx'))
const AccountOverview = lazy(() => import('./pages/Account/AccountOverview.jsx'))
const Profile = lazy(() => import('./pages/Account/Profile.jsx'))
const Orders = lazy(() => import('./pages/Account/Orders.jsx'))
const OrderDetails = lazy(() => import('./pages/Account/OrderDetails.jsx'))
const MyReviews = lazy(() => import('./pages/Account/MyReviews.jsx'))

// Admin
const AdminLayout = lazy(() => import('./layouts/AdminLayout.jsx'))
const AdminLogin = lazy(() => import('./pages/Admin/AdminLogin.jsx'))
const Dashboard = lazy(() => import('./pages/Admin/Dashboard/Dashboard.jsx'))
const AdminProducts = lazy(() => import('./pages/Admin/Products/AdminProducts.jsx'))
const ProductForm = lazy(() => import('./pages/Admin/Products/ProductForm.jsx'))
const AdminCategories = lazy(() => import('./pages/Admin/Categories/AdminCategories.jsx'))
const AdminOrders = lazy(() => import('./pages/Admin/Orders/AdminOrders.jsx'))
const AdminOrderDetails = lazy(() => import('./pages/Admin/Orders/AdminOrderDetails.jsx'))
const AdminCustomers = lazy(() => import('./pages/Admin/Customers/AdminCustomers.jsx'))
const AdminCustomerDetails = lazy(() => import('./pages/Admin/Customers/AdminCustomerDetails.jsx'))
const AdminReviews = lazy(() => import('./pages/Admin/Reviews/AdminReviews.jsx'))
const AdminDiscounts = lazy(() => import('./pages/Admin/Discounts/AdminDiscounts.jsx'))
const AdminSettings = lazy(() => import('./pages/Admin/Settings/AdminSettings.jsx'))

// All application routes live here.
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />} errorElement={<RouteError />}>
      <Route path='/' element={<App />}>
        <Route index element={<Home />} />
        <Route path='shop' element={<Shop />} />
        <Route path='category' element={<Categories />} />
        <Route path='category/:slug' element={<CategoryDetail />} />
        <Route path='product/:id' element={<ProductDetails />} />
        <Route path='search' element={<Search />} />
        <Route path='cart' element={<Cart />} />
        <Route path='wishlist' element={<Wishlist />} />
        <Route path='contact' element={<Contact />} />

        <Route element={<GuestOnly />}>
          <Route path='login' element={<Login />} />
          <Route path='signup' element={<Signup />} />
          <Route path='forgot-password' element={<ForgotPassword />} />
        </Route>
        <Route path='reset-password' element={<ResetPassword />} />

        <Route element={<RequireAuth />}>
          <Route path='checkout' element={<Checkout />} />
          <Route path='account' element={<AccountLayout />}>
            <Route index element={<AccountOverview />} />
            <Route path='profile' element={<Profile />} />
            <Route path='orders' element={<Orders />} />
            <Route path='orders/:id' element={<OrderDetails />} />
            <Route path='wishlist' element={<Wishlist embedded />} />
            <Route path='reviews' element={<MyReviews />} />
          </Route>
        </Route>

        <Route path='*' element={<NotFound />} />
      </Route>

      <Route path={ADMIN_BASE_PATH}>
        <Route index element={<AdminLogin />} />
        <Route element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route path='dashboard' element={<Dashboard />} />
          <Route path='products' element={<AdminProducts />} />
          <Route path='products/new' element={<ProductForm />} />
          <Route path='products/:id/edit' element={<ProductForm />} />
          <Route path='categories' element={<AdminCategories />} />
          <Route path='orders' element={<AdminOrders />} />
          <Route path='orders/:id' element={<AdminOrderDetails />} />
          <Route path='customers' element={<AdminCustomers />} />
          <Route path='customers/:id' element={<AdminCustomerDetails />} />
          <Route path='reviews' element={<AdminReviews />} />
          <Route path='discounts' element={<AdminDiscounts />} />
          <Route path='settings' element={<AdminSettings />} />
        </Route>
      </Route>
    </Route>
  )
);

applyCachedTheme()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
)
