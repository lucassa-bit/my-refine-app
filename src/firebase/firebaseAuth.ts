import { FirebaseApp } from "@firebase/app";
import {
  Auth,
  inMemoryPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  getIdTokenResult,
  ParsedToken,
  RecaptchaVerifier,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { IAuthCallbacks, ILoginArgs, IRegisterArgs, IUser } from "./interfaces";
import { detectPlatform } from "./helpers/detectPlatform";
import { AuthActionResponse, AuthProvider, CheckResponse, OnErrorResponse } from "@refinedev/core";

export class FirebaseAuth {
  auth: Auth;

  constructor(
    private readonly authActions?: IAuthCallbacks,
    firebaseApp?: FirebaseApp,
    auth?: Auth
  ) {
    this.auth = auth || getAuth(firebaseApp);
    this.auth.useDeviceLanguage();

    this.getAuthProvider = this.getAuthProvider.bind(this);
    this.handleLogIn = this.handleLogIn.bind(this);
    this.handleRegister = this.handleRegister.bind(this);
    this.handleLogOut = this.handleLogOut.bind(this);
    this.handleResetPassword = this.handleResetPassword.bind(this);
    this.onUpdateUserData = this.onUpdateUserData.bind(this);
    this.getUserIdentity = this.getUserIdentity.bind(this);
    this.handleCheckAuth = this.handleCheckAuth.bind(this);
    this.createRecaptcha = this.createRecaptcha.bind(this);
    this.getPermissions = this.getPermissions.bind(this);
  }

  public async handleLogOut(): Promise<AuthActionResponse> {
    await signOut(this.auth);
    await this.authActions?.onLogout?.(this.auth);
    return { success: true };
  }

  public async handleRegister(args: IRegisterArgs) {
    try {
      const { email, password, displayName } = args;

      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );
      await sendEmailVerification(userCredential.user);
      if (userCredential.user) {
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
        this.authActions?.onRegister?.(userCredential.user);
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  public async handleLogIn({ email, password, remember }: ILoginArgs) {
    try {
      if (this.auth) {
        let persistance = browserSessionPersistence;
        
        if (detectPlatform() === "react-native") {
          persistance = inMemoryPersistence;
        } else if (remember) {
          persistance = browserLocalPersistence;
        }
        
        await this.auth.setPersistence(persistance);

        const userCredential = await signInWithEmailAndPassword(
          this.auth,
          email,
          password
        );

        const userToken = await userCredential?.user?.getIdToken?.();
        
        if (userToken) {
          this.authActions?.onLogin?.(userCredential.user);
        } else {
          return Promise.reject(new Error("User is not found"));
        }
      } else {
        return Promise.reject(new Error("User is not found"));
      }
      return { success: true };
    } catch (error) {
      return Promise.reject(error);
    }
  }

  public handleResetPassword(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  public async onUpdateUserData(args: IRegisterArgs) {
    try {
      if (this.auth?.currentUser) {
        const { displayName, email, password } = args;
        if (password) {
          await updatePassword(this.auth.currentUser, password);
        }

        if (email && this.auth.currentUser.email !== email) {
          await updateEmail(this.auth.currentUser, email);
        }

        if (displayName && this.auth.currentUser.displayName !== displayName) {
          await updateProfile(this.auth.currentUser, {
            displayName: displayName,
          });
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private async getUserIdentity(): Promise<IUser> {
    const user = this.auth?.currentUser;
    return {
      ...this.auth.currentUser,
      email: user?.email || "",
      name: user?.displayName || "",
    };
  }

  private getFirebaseUser(): Promise<FirebaseUser> {
    return new Promise<FirebaseUser>((resolve, reject) => {
      const unsubscribe = this.auth?.onAuthStateChanged((user) => {
        unsubscribe();
        resolve(user as FirebaseUser | PromiseLike<FirebaseUser>);
      }, reject);
    });
  }

  private async handleCheckAuth(): Promise<CheckResponse> {
    if (await this.getFirebaseUser()) {
      return Promise.resolve({ authenticated: true });
    } else {
      return Promise.reject({ authenticated: false, error: new Error("User is not found") });
    }
  }

  public async getPermissions(): Promise<ParsedToken> {
    if (this.auth?.currentUser) {
      const idTokenResult = await getIdTokenResult(this.auth.currentUser);
      return idTokenResult?.claims;
    } else {
      return Promise.reject(new Error("User is not found"));
    }
  }

  public createRecaptcha(
    containerOrId: Auth,
    parameters: string | HTMLElement
  ) {
    return new RecaptchaVerifier(containerOrId, parameters, this.auth);
  }

  public getAuthProvider(): AuthProvider | undefined {
    return {
      login: this.handleLogIn,
      logout: this.handleLogOut,
      check: this.handleCheckAuth,
      getPermissions: this.getPermissions,
      getIdentity: this.getUserIdentity,
      onError: async (error: any): Promise<OnErrorResponse> => {
        console.error("Authentication error:", error);
        return { error };
      },
    };
  }
}
