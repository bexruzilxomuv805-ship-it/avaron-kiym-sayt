import { useSelector } from "react-redux";
import { selectIsLoggedIn } from "../store/authSlice.js";
import { Navigate, useLocation } from "react-router-dom";



function ProtectedRoute({ children }) {
    const isLoggedIn = useSelector(selectIsLoggedIn);
    const location = useLocation();

    if (!isLoggedIn) {
        return <Navigate to="/login" state={{ from: 
            location }} replace />;
    }

    return children;
}   

export default ProtectedRoute;