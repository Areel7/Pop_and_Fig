import { createSlice } from "@reduxjs/toolkit";

// Only the non-sensitive profile is cached for the UI; the JWT itself is an httpOnly cookie.
const readUser = () => {
    try {
        const expiration = Number(localStorage.getItem("expirationTime"));
        if (expiration && expiration < Date.now()) {
            localStorage.removeItem("userInfo");
            localStorage.removeItem("expirationTime");
            return null;
        }
        const raw = localStorage.getItem("userInfo");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const initialState = {
    userInfo: readUser(),
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            state.userInfo = action.payload;
            try {
                localStorage.setItem("userInfo", JSON.stringify(action.payload));
                const expirationTime = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
                localStorage.setItem("expirationTime", expirationTime);
            } catch {
                // Storage unavailable (private mode) — the in-memory state still works.
            }
        },
        logout: (state) => {
            state.userInfo = null;
            try {
                localStorage.removeItem("userInfo");
                localStorage.removeItem("expirationTime");
            } catch {
                // ignore
            }
        },
    },
});

export const { setCredentials, logout } = authSlice.actions;
export const selectCurrentUser = (state) => state.auth.userInfo;
export default authSlice.reducer;
