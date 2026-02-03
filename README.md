# Data Extractor Tool

A professional full-stack monorepo application for extracting and transforming Excel/CSV data to SQL format. Built with Angular 17+ and Node.js/Express.

## 🚀 Features

- **File Upload**: Support for Excel (XLSX/XLS) and CSV files
- **Data Processing**: Transform and validate data with custom schemas
- **Real-time Preview**: View processed data before export
- **Schema Validation**: Ensure data integrity with predefined templates
- **Modern UI**: Clean interface built with Angular Material

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)

## 🏗️ Project Structure

```
Extractor-Data/
├── frontend/           # Angular 17+ application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # Reusable UI components
│   │   │   └── services/      # API service layer
│   │   └── styles.css         # Global styles
│   └── package.json
├── backend/            # Node.js/Express API
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── routes/            # API routes
│   │   └── index.js           # Server entry point
│   └── package.json
├── .gitignore
└── README.md
```

## 🔧 Installation

### Clone the Repository

```bash
git clone https://github.com/Lenny004/Extractor-Data.git
cd Extractor-Data
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
PORT=3000
NODE_ENV=development
```

5. Start the development server:
```bash
npm run dev
```

The backend API will be running at `http://localhost:3000`

### Frontend Setup

1. Navigate to the frontend directory (from project root):
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend application will be running at `http://localhost:4200`

## 🎯 Usage

1. **Upload a File**: Click on the upload area or drag and drop an Excel/CSV file
2. **View Data**: Preview the extracted data in the data viewer table
3. **Process**: Click "Upload File" to send data to the backend for processing
4. **Validate**: Use schema validation to ensure data integrity
5. **Export**: Download the processed data in SQL format

## 🛠️ Development

### Backend Commands

```bash
npm start       # Start production server
npm run dev     # Start development server with hot reload
```

### Frontend Commands

```bash
npm start       # Start development server
npm run build   # Build for production
npm test        # Run unit tests
```

## 📚 API Endpoints

### Files

- `POST /api/files/upload` - Upload a file
- `POST /api/files/process` - Process uploaded file data
- `GET /api/files/download/:id` - Download processed file

### Schemas

- `POST /api/schemas/validate` - Validate data against schema
- `GET /api/schemas/templates` - Get available schema templates

### Health Check

- `GET /api/health` - Check API status

## 🎨 Code Standards

### Naming Conventions

- **PascalCase**: Used for component classes, interfaces, and class properties
- **BEM (Block Element Modifier)**: Used for CSS class naming

Example:
```css
.FileUpload { }
.FileUpload__Header { }
.FileUpload__Button--Primary { }
```

### CSS

- Native CSS only (no Tailwind)
- BEM naming convention for all classes
- Responsive design with mobile-first approach

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📦 Building for Production

### Backend

```bash
cd backend
npm start
```

### Frontend

```bash
cd frontend
npm run build
```

The production build will be created in the `frontend/dist` directory.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Angular Team for the amazing framework
- Node.js and Express communities
- Angular Material for the UI components

## 📞 Support

For support, email your-email@example.com or open an issue in the repository.
