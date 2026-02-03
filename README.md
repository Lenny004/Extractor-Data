# Data Extractor Tool

<p align="center">
  <strong>Excel/CSV to SQL Converter</strong><br>
  A full-stack monorepo application for extracting and transforming data from Excel (XLSX/XLS) and CSV files into SQL statements.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Angular-19+-DD0031?style=flat&logo=angular" alt="Angular 19+">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=flat&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=flat&logo=express" alt="Express">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat&logo=typescript" alt="TypeScript">
</p>

---

## 📋 Table of Contents

- [Features](#-features)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Running the Application](#-running-the-application)
- [API Endpoints](#-api-endpoints)
- [Development Standards](#-development-standards)
- [Required Skills](#-required-skills)
- [License](#-license)

---

## ✨ Features

- **File Upload**: Drag & drop or click to upload Excel (XLSX, XLS) and CSV files
- **Data Preview**: Interactive table with pagination for reviewing imported data
- **Schema Detection**: Automatic detection of column data types
- **Schema Editor**: Manual adjustment of column types (VARCHAR, INTEGER, DECIMAL, DATE, BOOLEAN, etc.)
- **SQL Generation**: Generate CREATE TABLE and INSERT statements
- **Export Options**: Copy to clipboard or download as .sql file
- **Responsive Design**: Works on desktop and mobile devices

---

## 📁 Project Structure

```
Extractor-Data/
├── frontend/                    # Angular 19+ application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/     # UI Components (PascalCase)
│   │   │   │   ├── FileUploader/
│   │   │   │   ├── DataPreview/
│   │   │   │   ├── SchemaEditor/
│   │   │   │   └── SqlGenerator/
│   │   │   ├── services/       # Services (camelCase)
│   │   │   ├── models/         # TypeScript interfaces
│   │   │   └── app.component.* # Root component
│   │   ├── styles.css          # Global styles
│   │   └── index.html
│   ├── angular.json
│   └── package.json
│
├── backend/                     # Node.js/Express server
│   ├── src/
│   │   ├── controllers/        # Request handlers
│   │   ├── routes/             # API route definitions
│   │   ├── utils/              # Utility functions
│   │   └── index.js            # Server entry point
│   └── package.json
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Node.js | 18.x or higher | `node --version` |
| npm | 8.x or higher | `npm --version` |
| Angular CLI | 19.x or higher | `ng version` |

### Installing Angular CLI

```bash
npm install -g @angular/cli@19
```

---

## 📥 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Lenny004/Extractor-Data.git
cd Extractor-Data
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## 🚀 Running the Application

### Start the Backend Server

```bash
cd backend
npm start
```

The server will start on `http://localhost:3000`

### Start the Frontend Development Server

In a new terminal:

```bash
cd frontend
npm start
```

The application will be available at `http://localhost:4200`

### Development Mode (with auto-reload)

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
ng serve
```

---

## 🔌 API Endpoints

### File Processing

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload and process a file |
| POST | `/api/files/parse` | Parse file and return structured data |
| POST | `/api/files/preview` | Get file data preview (limited rows) |

### Schema Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/schema/validate` | Validate data against a schema |
| POST | `/api/schema/detect` | Auto-detect schema from data |
| GET | `/api/schema/types` | Get supported data types |

### SQL Generation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sql/generate/insert` | Generate INSERT statements |
| POST | `/api/sql/generate/create-table` | Generate CREATE TABLE statement |
| POST | `/api/sql/generate/full` | Generate complete SQL script |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Check server status |

---

## 📐 Development Standards

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `FileUploader`, `DataPreview` |
| Service Classes | PascalCase | `FileService`, `SchemaService` |
| Service Instances | camelCase | `fileService`, `schemaService` |
| CSS Classes | BEM | `.file-uploader__dropzone--active` |

### BEM CSS Methodology

```css
/* Block */
.file-uploader { }

/* Element */
.file-uploader__dropzone { }

/* Modifier */
.file-uploader__dropzone--active { }
```

### Code Style

- **TypeScript**: Strict mode enabled
- **CSS**: Native CSS (no Tailwind)
- **Components**: Standalone Angular components
- **Imports**: Prefer explicit imports

---

## 🎯 Required Skills

To effectively work on and maintain this project, developers should have knowledge in:

### Frontend Development

- **Angular 19+**
  - Standalone components
  - Signals and control flow (@if, @for)
  - Dependency injection
  - Reactive programming with RxJS

- **Angular Material**
  - Material Design components
  - Theming and customization

- **TypeScript**
  - Type definitions and interfaces
  - Generics and utility types

- **CSS**
  - BEM naming convention
  - Flexbox and CSS Grid
  - Responsive design principles

### Backend Development

- **Node.js**
  - ES6+ JavaScript
  - Async/await patterns
  - File system operations

- **Express.js**
  - RESTful API design
  - Middleware patterns
  - Error handling

- **Data Processing**
  - Working with the ExcelJS library
  - CSV/Excel file parsing
  - Data transformation

### General Skills

- Git version control
- npm package management
- REST API concepts
- SQL basics (CREATE TABLE, INSERT)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<p align="center">
  Made with ❤️ by the Data Extractor Team
</p>
