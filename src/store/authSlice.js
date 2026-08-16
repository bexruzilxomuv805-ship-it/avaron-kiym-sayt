import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../api/api.js";

const initialState = {
  user: null,
  status: "idle",
  error: null,
};

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.get("/users");
      const user = response.data.find(
        (u) => u.email === email && u.password === password
      );
      if (!user) {
        return rejectWithValue("Email yoki parol noto'g'ri.");
      }
      return user;
    } catch (error) {
      return rejectWithValue("Server bilan aloqa o'rnatib bo'lmadi.");
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const check = await api.get("/users");
      const emailExists = check.data.find((u) => u.email === email);
      if (emailExists) {
        return rejectWithValue("Bu email allaqachon ro'yxatdan o'tgan.");
      }

      const response = await api.post("/users", {
        name,
        email,
        password,
        role: "user",
      });
      return response.data;
    } catch (error) {
      return rejectWithValue("Ro'yxatdan o'tishda xatolik yuz berdi.");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { logout } = authSlice.actions;
export const selectIsLoggedIn = (state) => Boolean(state.auth.user);
export const selectIsAdmin = (state) => state.auth.user?.role === "admin";

export default authSlice.reducer;
