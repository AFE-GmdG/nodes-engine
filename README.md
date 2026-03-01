# nodes-engine

> **🚧 Experimenteller Status**: Dieses Projekt befindet sich in einem sehr frühen und experimentellen Stadium. Größere Änderungen der API und Architektur sollten erwartet werden.

Eine Node-basierte Game Engine mit Entity Component System (ECS) Architektur. Das Projekt erkundet innovative Ansätze zur Szenen- und Gameplay-Konfiguration durch Node-Netzwerke, angetrieben von moderner Web-Grafiktechnologie.

## 🎯 Vision

Erstellung einer Web-basierten Game Engine, die:
- **ECS-Architektur** für flexible und modulare Spiellogik nutzt
- **WebGPU** für hochperformante GPU-Rendering nutzt
- **Node-basierte Workflows** für intuitives Game Development bietet
- **Experimentell** neue Designkonzepte erforscht
## 📦 Projektstruktur

```
nodes-engine/
├── packages/
│   ├── spa/                  # Testanwendung (Vite SPA)
│   └── nodes-engine/         # Haupt-Engine Package
├── package.json              # Workspace Konfiguration (Yarn)
└── tsconfig.base.json        # TypeScript Basis-Konfiguration
```

### Packages

- **[@afegmdg/nodes-engine](./packages/nodes-engine)** (v0.2.0)
  Die Kern-Engine mit ECS-System, Math-Utilities und Node-Factory

- **[@afegmdg/spa](./packages/spa)** (v0.2.0)
  Testanwendung zur Demonstration und Validierung der Engine

## 🛠️ Setup

### Anforderungen
- Node.js 22+
- Yarn (classic) Workspace Manager
- Browser mit WebGPU Support (Chrome 145+, Firefox 145+)

### Installation

```bash
# Dependencies installieren
yarn

# Volles Projektbuild
# SPA zieht automatisch die Engine als Dependency
yarn build

# Engine bauen
# nur die Library ohne SPA, kann für andere Projekte genutzt werden
yarn build:engine

# Alle Libraries bauen (Aktuell ist das nur die Engine)
yarn build:libraries
```

### Weitere Kommandos

```bash
yarn dev              # Startet den Entwicklungsserver für die SPA
yarn errorcheck       # TypeScript Type Checking
yarn lint             # ESLint validation
yarn clean            # Löscht alle Build-Ordner
yarn rr               # Löscht alle node_modules Ordner (Reset)
```

## 🐛 Debugging

Das Projekt kommt mit einer vollständigen VS Code Konfiguration (`nodes-engine.code-workspace`), die alle projektspezifischen Settings, Launch-Konfigurationen und Tasks enthält.

### Automatisiertes Debugging

Das Debuggen funktioniert **vollautomatisch über die VS Code Seitenleiste**:

1. Öffne die **Run and Debug** Seitenleiste (Ctrl+Shift+D)
2. Starte die Launch-Konfiguration **Debug Node-Engine (Arbeitsbereich)**
3. Der Entwicklungsserver wird **automatisch gestartet** – kein manuelles Starten nötig!
4. Der Browser verbindet sich automatisch zum Debugger

### VS Code Workspace

Die Datei `nodes-engine.code-workspace` enthält:
- Projektspezifische Editor-Settings aber keine persönlichen Einstellungen
- Launch-Konfigurationen für Debugging
- Vordefinierte Tasks für Build und Dev-Server

Öffne das Projekt über diese Workspace-Datei für optimale Entwicklungserfahrung.

## 🏗️ Architektur

### Technologie-Stack

- **Grafik**: WebGPU (native GPU-API für Web)
- **Programmierung**: TypeScript
- **Build**: Vite (SPA), TypeScript Compiler (Engine)
- **Math**: Custom Vector3, Quaternion, Matrix4 Implementierungen
- **Qualität**: ESLint + TypeScript strict mode

## 📋 Features & Roadmap

### Aktuell
- ✅ Base Application Framework
- ✅ Node Factory Pattern
- ✅ Mathematik-Bibliothek (Vector3, Quaternion, Matrix4)
- ✅ WebGPU Integration

### Geplant
- 🔄 ECS-Basis-Framework
- 🔄 Performance-Optimierungen

## ⚠️ Warnung

Dieses Projekt ist in einem sehr frühen Entwicklungsstadium. Die API und interne Struktur können sich drastisch ändern. Verwende diese Engine **nicht** für Production-Projekte.

Und ja: Ich nutze **deutschsprachige Kommentare und Dokumentation**. Ich möchte mir nicht bei jedem Satz überlegen, wie man das auf Englisch formuliert. Das Projekt ist in erster Linie für mich selbst, um neue Ideen zu erforschen. Wenn es anderen Entwicklern hilft, ist das großartig - interessiert mich aber nur mässig.

## 📄 Lizenz

Siehe [LICENSE](./LICENSE) für Details.
