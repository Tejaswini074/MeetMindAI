import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getStoredTokens, saveTokens, clearTokens } from '../../services/secureStorage';
import { AuthTokens, User } from '../../types/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  /** True once we've checked secure storage for existing tokens on app launch. */
  bootstrapped: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  bootstrapped: false,
};

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async () => {
  const { accessToken, refreshToken } = await getStoredTokens();
  return { accessToken, refreshToken };
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.tokens.accessToken;
      state.refreshToken = action.payload.tokens.refreshToken;
      void saveTokens(action.payload.tokens.accessToken, action.payload.tokens.refreshToken);
    },
    setTokens(state, action: PayloadAction<AuthTokens>) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      void saveTokens(action.payload.accessToken, action.payload.refreshToken);
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      void clearTokens();
    },
  },
  extraReducers: (builder) => {
    builder.addCase(bootstrapAuth.fulfilled, (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.bootstrapped = true;
    });
    builder.addCase(bootstrapAuth.rejected, (state) => {
      state.bootstrapped = true;
    });
  },
});

export const { setCredentials, setTokens, setUser, logout } = authSlice.actions;
export default authSlice.reducer;
