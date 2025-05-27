# 🏛️ Faculty Renewal Portal

A full-stack web application for managing university faculty contract renewals, built with a React frontend and Node.js backend. It streamlines the review process with role-specific dashboards, automated evaluation summaries using LLMs, and structured workflows.

---

## 🚀 Features

- Faculty application and document upload
- Admin, HR, Provost, VC, and Dean role panels
- PDF evaluation uploads & LLM-based auto-summary
- Secure JWT authentication and user management
- PDF viewer, decision panels, and tracking UI
- Local file storage for uploaded documents

---

## 🛠️ Technologies Used

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **Database**: MySQL
- **LLM Integration**: OpenAI or Ollama
- **File Uploads**: multer + local storage
- **Styles**: CSS Modules

---

## 📁 Project Structure

```
faculty-renewal-portal/
│
├── src/
│   ├── components/         # UI components like Panel, Tabs, etc.
│   ├── contexts/           # AuthContext for global login state
│   ├── pages/              # Role-based pages: HRPanel, VCPanel, etc.
│   ├── services/           # API utilities
│   ├── styles/             # CSS files for components
│   ├── App.js              # Main app routing
│   └── index.js            # React entry point
│
├── uploads/
│   └── evaluation_documents/  # Stores uploaded PDF evaluations
│
├── templates/              # Placeholder for document templates
├── .env                    # Environment variables
├── package.json            # Dependencies
├── README.md               # You're here
└── testOllama.js           # Sample script to test LLM
```

---

## ⚙️ Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/nepho170/faculty-renewal-portal.git
cd faculty-renewal-portal
```

---

### 2. Backend Setup

#### Install server dependencies:
```bash
npm install
```

#### Create `.env` file:
```env
PORT=5003
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=faculty_renewal_portal
DB_PORT=3306
JWT_SECRET=your-secret-key
```

#### Start the backend:
```bash
npm start
```

---

### 3. Frontend Setup (React)

If the React app is in a subdirectory (`client/`), navigate into it:
```bash
cd client
npm install
npm start
```

---

### 🧪 Testing Ollama / AI Evaluation

You can test the connected LLM summarization system:
```bash
node testOllama.js
```

---

### 📤 Upload Evaluation Document

Upload faculty evaluations using the backend script:
```bash
node uploadDocument.js path/to/report.pdf <facultyId> <applicationId>
```

Uploaded files are saved under:
```
/uploads/evaluation_documents/
```

---

## ✅ Requirements

Install all backend dependencies:
```bash
npm install axios dotenv express fs-extra mysql2 multer
```

---

## 📝 License

MIT License

---



## 📌 Notes![Screenshot (1819)](https://github.com/user-attachments/assets/f15d3e59-63ee-4f80-88d0-e5f8fad0854f)
## 🖼️ Screenshots

[<img src="https://github.com/user-attachments/assets/014dd63e-7c1c-45fd-b566-27830f1911c2" width="300"/>](https://github.com/user-attachments/assets/014dd63e-7c1c-45fd-b566-27830f1911c2)
[<img src="https://github.com/user-attachments/assets/c229e396-62cf-458f-8159-04e7b3fd8019" width="300"/>](https://github.com/user-attachments/assets/c229e396-62cf-458f-8159-04e7b3fd8019)
[<img src="https://github.com/user-attachments/assets/d0210bff-58c7-4de4-9794-227a455e771a" width="300"/>](https://github.com/user-attachments/assets/d0210bff-58c7-4de4-9794-227a455e771a)
[<img src="https://github.com/user-attachments/assets/eda8bc53-4181-4b96-9bb7-4993c82a8675" width="300"/>](https://github.com/user-attachments/assets/eda8bc53-4181-4b96-9bb7-4993c82a8675)


This project handles sensitive academic workflows. Ensure `.env` files and credentials are **not committed** to version control.


