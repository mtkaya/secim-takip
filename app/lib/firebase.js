import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyARq30LxvQk8VOPrXMVicUimAaaj-ZlVYk",
  authDomain: "secim-takip-ea62d.firebaseapp.com",
  databaseURL: "https://secim-takip-ea62d-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "secim-takip-ea62d",
  storageBucket: "secim-takip-ea62d.firebasestorage.app",
  messagingSenderId: "391370672742",
  appId: "1:391370672742:web:8a81debac198a7cfd87ba7"
};

const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);
