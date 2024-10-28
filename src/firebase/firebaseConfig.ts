// Import the functions you need from the SDKs you need
import exp from "constants";
import {initializeFirebase, FirestoreDatabase, FirebaseAuth} from "./index";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDukQcU0Ip61Ogi2j4n6UXogN1WfnhTULo",
  authDomain: "teste-template-crud.firebaseapp.com",
  databaseURL: "https://teste-template-crud-default-rtdb.firebaseio.com",
  projectId: "teste-template-crud",
  storageBucket: "teste-template-crud.appspot.com",
  messagingSenderId: "647140289416",
  appId: "1:647140289416:web:6510141f47b8d1e1b8a83d"
};

// Initialize Firebase
export const initApp = initializeFirebase(firebaseConfig);
export const firebaseAuth = new FirebaseAuth();
export const firestoreDatabase = new FirestoreDatabase();