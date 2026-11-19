interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  // "sim" liga o app aos emuladores locais, usados nos testes. Nunca defina no site publicado.
  readonly VITE_USAR_EMULADOR?: string;
}
