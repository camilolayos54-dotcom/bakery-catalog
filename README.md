# 🥖 Bakery Catalog & POS

Sistema de Catálogo Digital y Punto de Venta (POS) móvil y web diseñado específicamente para panaderías y reposterías. Construido con **React Native**, **Expo SDK 57**, **Expo Router** y **SQLite**, optimizado para operar 100% offline con sincronización flexible de datos e imágenes.

---

## 📋 Tabla de Contenidos

1. [Características Principales](#-características-principales)
2. [Arquitectura del Sistema](#-arquitectura-del-sistema)
3. [Estructura del Proyecto](#-estructura-del-proyecto)
4. [Requisitos Previos](#-requisitos-previos)
5. [Instalación y Configuración](#-instalación-y-configuración)
6. [Ejecución en Entornos de Desarrollo](#-ejecución-en-entornos-de-desarrollo)
7. [Módulos del Sistema](#-módulos-del-sistema)
   - [Catálogo y Navegación](#1-catálogo-y-navegación)
   - [Calculadora de Sumas (POS / Carrito)](#2-calculadora-de-sumas-pos--carrito)
   - [Panel de Administración y Editor](#3-panel-de-administración-y-editor)
   - [Sincronización y Respaldo](#4-sincronización-y-respaldo)
8. [Scripts de Utilidad](#-scripts-de-utilidad)
9. [Compilación y Despliegue (APK / Web)](#-compilación-y-despliegue-apk--web)
10. [Licencia](#-licencia)

---

## 🚀 Características Principales

- **Offline-First**: Persistencia de datos local utilizando `expo-sqlite` en dispositivos móviles y almacenamiento local en entorno web.
- **Catálogo Visual Dinámico**: Agrupación por categorías, subcategorías y ordenamiento personalizado de productos.
- **Punto de Venta Rápido (Sumas)**:
  - Registro de ventas ágil con desglose en tiempo real.
  - Reglas de promociones automáticas por volumen (ej. "Lleva 4 por $2.000").
  - Cálculo de cambio/devuelta y desglose de ahorro en combos.
- **Gestor de Contenidos (Editor)**:
  - CRUD completo de productos, categorías y subcategorías.
  - Carga masiva (*Bulk import*) de productos.
  - Soporte de fotografías desde galería o cámara con compresión y guardado local.
- **Respaldos Portables**: Exportación e importación de la base de datos completa con imágenes serializadas en Base64 en formato JSON.
- **Acceso Multiplataforma**: Compatible con Android (APK nativo) y Web (accesible desde navegador de escritorio/laptop en red local).

---

## 🏗 Arquitectura del Sistema

El proyecto sigue una arquitectura modular desacoplada:

```
┌────────────────────────────────────────────────────────┐
│                   Expo Router / UI                     │
│    (Tabs: Catálogo, Sumas/POS, Editor, Grupos)         │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                    Zustand Store                       │
│    (Estado global de carrito, filtros y navegación)    │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  Servicios y Dominio                   │
│   • Cart & Money Lib (Cálculos de promos y monedas)    │
│   • Sync Engine (Export/Import de backups en JSON)     │
│   • Image Storage Manager (Manejo local & Base64)      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│               Capa de Datos (Repository)               │
│   • SQLite (Android / iOS)                             │
│   • Local Storage / In-Memory Adapter (Web)            │
└────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```text
bakery-catalog/
├── assets/                  # Íconos, splash screen e imágenes de la app
├── data_sync/               # Almacenamiento local de copias de seguridad JSON
├── scripts/                 # Scripts auxiliares de desarrollo y pruebas
│   ├── sync_data.ts         # Script CLI para inspección y exportación de datos
│   └── test_sumas.ts        # Suite de pruebas para lógica de precios y combos
├── src/
│   ├── app/                 # Rutas y vistas basadas en Expo Router
│   │   ├── _layout.tsx      # Configuración global del layout
│   │   └── (tabs)/          # Vistas con barra de navegación inferior
│   │       ├── index.tsx    # Catálogo visual de productos
│   │       ├── sumas.tsx    # Pantalla de POS / Carrito rápido
│   │       ├── editor/      # Panel de edición de productos y categorías
│   │       │   ├── [id].tsx # Edición individual de producto
│   │       │   ├── bulk.tsx # Creación masiva de productos
│   │       │   └── groups.tsx# Gestión de grupos y ordenamiento
│   │       └── _layout.tsx  # Navegador de pestañas
│   ├── components/          # Componentes reutilizables (ProductCard, SyncModal, etc.)
│   ├── db/                  # Capa de persistencia (SQLite, repositorios e inicializadores)
│   ├── lib/                 # Lógica pura: cart, money, images, dialogs, sync
│   ├── store.ts             # Estado global con Zustand
│   └── types.ts             # Definiciones TypeScript de entidades y payloads
├── app.json                 # Manifiesto y configuración de Expo / Android
├── package.json             # Dependencias del proyecto
├── tsconfig.json            # Configuración de TypeScript
├── Abrir-Catalogo.bat       # Lanzador en un clic para Windows (Web local)
└── Generar-APK.bat          # Script en un clic para compilar APK con EAS
```

---

## ⚙️ Requisitos Previos

- **Node.js**: Versión 18.x o superior (recomendado 20.x LTS).
- **npm** o **bun**: Gestor de paquetes.
- **Expo CLI**: Incluido en las dependencias de desarrollo (`npx expo`).
- Para compilar APK nativo: Cuenta en [Expo EAS](https://expo.dev) y `eas-cli`.

---

## 📦 Instalación y Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/camilolayos54-dotcom/bakery-catalog.git
   cd bakery-catalog
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

---

## 💻 Ejecución en Entornos de Desarrollo

### 🌐 Modo Web (Navegador local)
Ideal para usar en una laptop o PC de mostrador:
```bash
npm run web
# o directamente:
npx expo start --web --port 8081
```

> **En Windows:** Puedes hacer doble clic sobre `Abrir-Catalogo.bat` para iniciar el servidor y abrir el navegador automáticamente.

### 📱 Modo Móvil (Expo Go / Emulador Android)
```bash
npx expo start
```
- Presiona `a` en la terminal para abrir en el emulador de Android.
- O escanea el código QR desde la app **Expo Go** en tu dispositivo físico Android.

---

## 🧩 Módulos del Sistema

### 1. Catálogo y Navegación
- **Filtro dinámico**: Permite navegar entre pestañas de grupos (ej. *Panes*, *Pastelería*, *Bebidas*) y subcategorías.
- **Búsqueda inmediata**: Búsqueda en tiempo real por nombre de producto.
- **Frecuencia de compra**: Registro de frecuencia para destacar los productos más vendidos.

### 2. Calculadora de Sumas (POS / Carrito)
- **Cálculo de Promociones**: Sistema inteligente que detecta reglas por cantidad (ejemplo: 1 unidad a \$600, combo de 4 por \$2.000). Calcula automáticamente la combinación óptima de unidades sueltas + combos y refleja el ahorro obtenido.
- **Manejo de Moneda Segura**: Todas las operaciones internas se computan en centavos enteros para evitar errores de redondeo de punto flotante.
- **Cobro en Efectivo**: Entrada rápida de billetes recibidos y cálculo automático del cambio.

### 3. Panel de Administración y Editor
- **Gestión de Productos**: Alta, modificación de precios, promociones, categoría y fotografía.
- **Edición Rápida Masiva**: Añade múltiples productos en lote de forma ágil.
- **Orden de Presentación**: Reordena las categorías para priorizar los productos de mayor rotación según el horario del día.

### 4. Sincronización y Respaldo
- **Exportación en JSON**: Genera un archivo con timestamp legible que incluye todas las tablas de la base de datos y las imágenes codificadas en Base64.
- **Importación Inteligente**: Permite restaurar el catálogo en un nuevo teléfono o navegador sin necesidad de internet ni servidores externos.

---

## 🛠 Scripts de Utilidad

El proyecto incluye scripts TypeScript listos para ejecutarse con `tsx` o `npx`:

- **Verificar lógica de precios y combos:**
  ```bash
  npx tsx scripts/test_sumas.ts
  ```
- **Inspeccionar o exportar datos por consola:**
  ```bash
  npm run sync:info
  npm run sync:export
  ```

---

## 📱 Compilación y Despliegue (APK / Web)

### Generación de APK para Android (vía EAS Build)
1. Instalar EAS CLI si no lo tienes:
   ```bash
   npm install -g eas-cli
   ```
2. Iniciar sesión en tu cuenta de Expo:
   ```bash
   eas login
   ```
3. Generar el instalador APK:
   ```bash
   eas build -p android --profile preview
   ```
   > **En Windows:** Puedes ejecutar el script `Generar-APK.bat` para automatizar este proceso.

### Despliegue Web
Para exportar la versión estática web para subir a cualquier hosting (Vercel, Netlify, Cloudflare Pages o servidor local):
```bash
npx expo export --platform web
```
Los archivos optimizados se generarán en la carpeta `dist/`.

---

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).
