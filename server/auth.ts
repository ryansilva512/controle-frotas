import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import express, { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual, createCipheriv, createDecipheriv } from "crypto";
import { promisify } from "util";
import { supabase } from "./lib/supabase";
import { insertUserSchema, type User } from "@shared/schema";
import fs from "fs";
import path from "path";
import createMemoryStore from "memorystore";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scryptAsync = promisify(scrypt);
const MemoryStore = createMemoryStore(session);

// Configuração de Criptografia para o arquivo de credenciais
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.SESSION_SECRET || 'super-secret-key-32-chars-long-!!!!!';
// Ensure key is 32 bytes
const key = scryptAsync(SECRET_KEY, 'salt', 32) as Promise<Buffer>;

async function encrypt(text: string): Promise<string> {
  const k = await key;
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, k, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Funções de Hashing de Senha
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Armazenamento em Arquivo Seguro
async function saveToSecureDocs(userData: any) {
  try {
    const docsDir = path.resolve(__dirname, "../../docs");
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    const filePath = path.join(docsDir, "credentials.json");
    let currentData = [];
    
    if (fs.existsSync(filePath)) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        currentData = JSON.parse(fileContent);
      } catch (e) {
        console.error("Erro ao ler arquivo de credenciais:", e);
      }
    }

    // Criptografar a senha antes de salvar no arquivo (embora já esteja hash no DB, 
    // o requisito pede credenciais seguras. Vamos salvar o hash do DB para consistência)
    // O requisito diz: {"usuario": "", "senha": "", "data_criacao": "", "ultimo_acesso": ""}
    
    const newEntry = {
      usuario: userData.username,
      senha: userData.password, // Este já é o hash seguro
      data_criacao: new Date().toISOString(),
      ultimo_acesso: null
    };
    
    currentData.push(newEntry);
    
    fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2));
  } catch (error) {
    console.error("Erro ao salvar credenciais em arquivo:", error);
  }
}

export function setupAuth(app: Express) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "vascotrack-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
        secure: app.get("env") === "production",
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1); // trust first proxy
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      async (username, password, done) => {
      try {
        const { data: user, error } = await supabase
          .from("users")
          .select("*")
          .eq("username", username)
          .single();

        if (error || !user) {
          return done(null, false, { message: "Usuário não encontrado" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Senha incorreta" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) {
        return done(error, null);
      }
      
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Rotas de Autenticação
  app.post("/api/register", async (req, res, next) => {
    try {
      const validation = insertUserSchema.safeParse(req.body);
      if (!validation.success) {
        const errorMessages = validation.error.errors.map((e) => e.message).join(", ");
        return res.status(400).json({ message: errorMessages });
      }

      const { username, password } = validation.data;

      // Verificar se usuário já existe
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .single();

      if (existingUser) {
        return res.status(400).json({ message: "E-mail já cadastrado" });
      }

      const hashedPassword = await hashPassword(password);

      const { data: newUser, error } = await supabase
        .from("users")
        .insert([
          {
            username,
            password: hashedPassword,
            name: username.split("@")[0], // Default name from email
          }
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Salvar no arquivo de documentação
      await saveToSecureDocs(newUser);

      req.login(newUser, (err) => {
        if (err) return next(err);
        return res.status(201).json({ 
          message: "Cadastro realizado com sucesso",
          user: { id: newUser.id, username: newUser.username, name: newUser.name }
        });
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Falha no login" });
      }
      req.login(user, async (err) => {
        if (err) return next(err);
        
        // Atualizar último acesso
        await supabase
          .from("users")
          .update({ last_access: new Date().toISOString() })
          .eq("id", user.id);
          
        return res.json({ 
          message: "Login realizado com sucesso",
          user: { id: user.id, username: user.username, name: user.name }
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    const user = req.user as any;
    res.json({ 
      id: user.id, 
      username: user.username, 
      name: user.name 
    });
  });
}
