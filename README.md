# Mortgage Application Platform

A comprehensive borrower-focused mortgage application platform with loan progress tracking, document management, and real-time status updates.

## 🌟 Features

### Borrower Dashboard
- **Loan Information Overview**: Real-time loan details, progress tracking, and status updates
- **Document Management**: Upload and track required documents with status indicators
- **Progress Tracking**: Visual timeline of loan milestones and completion status
- **Service Provider Information**: Contact details for title company, appraiser, and insurance
- **Loan Officer Contact**: Direct communication with assigned loan officer

### Application Features
- **Multi-step Application Form**: Streamlined mortgage application process
- **Co-borrower Support**: Add up to one co-borrower with individual information
- **Employment History**: Present/prior employer tracking with date management
- **Assets & Liabilities**: Comprehensive financial information collection
- **Residence History**: Integrated into borrower information section

### Visual Design
- **Dark Green Theme**: Beautiful animated background with floating orbs
- **White Section Backgrounds**: Excellent readability with high contrast
- **Motion Effects**: Smooth animations and hover effects throughout
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## 🚀 Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **React Router**: Client-side routing and navigation
- **React Icons**: Beautiful icon library (Font Awesome)
- **CSS3**: Advanced styling with animations and responsive design
- **React Toastify**: User-friendly notifications

### Backend
- **Spring Boot**: Java-based REST API framework
- **Spring Data JPA**: Database abstraction and ORM
- **H2 Database**: In-memory database for development
- **Maven**: Dependency management and build tool

## 📁 Project Structure

```
mortgage-app/
├── frontend/                 # React frontend application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── styles/         # CSS stylesheets
│   │   └── App.js          # Main application component
│   ├── package.json        # Frontend dependencies
│   └── README.md           # Frontend documentation
├── backend/                 # Spring Boot backend
│   ├── src/main/java/      # Java source code
│   ├── src/main/resources/ # Configuration files
│   └── pom.xml            # Maven dependencies
├── .gitignore             # Git ignore rules
└── README.md              # Project documentation
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- Java 11 or higher
- Maven 3.6 or higher

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

### Backend Setup
```bash
cd backend
mvn clean install
mvn spring-boot:run
```

## 🎯 Key Components

### Home Page
- Personalized loan information dashboard
- Quick access to key loan details
- Recent activity timeline
- Loan officer contact information

### Dashboard
- Comprehensive loan progress tracking
- Document status management
- Underwriting conditions
- Service provider information
- Milestone timeline

### Application Form
- Multi-step mortgage application
- Borrower and co-borrower information
- Employment and residence history
- Assets and liabilities tracking

## 🎨 Design Features

### Color Scheme
- **Primary Green**: #32cd32, #228b22, #006400
- **Background**: Dark green gradient with animated orbs
- **Sections**: Clean white backgrounds for readability
- **Accents**: Green gradients and glows

### Animations
- **Gradient Shifts**: 15-second background color transitions
- **Floating Orbs**: Subtle radial gradient movements
- **Card Floating**: Gentle up-and-down motion
- **Progress Bars**: Animated fills with shimmer effects
- **Hover Effects**: Smooth transitions and glows

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop**: Full feature set with multi-column layouts
- **Tablet**: Adapted layouts with touch-friendly interactions
- **Mobile**: Single-column layouts with optimized navigation

## 🔧 Development

### Available Scripts
- `npm start`: Start development server
- `npm build`: Build for production
- `npm test`: Run test suite
- `mvn test`: Run backend tests

### Code Style
- ESLint for frontend code quality
- Prettier for code formatting
- Consistent naming conventions
- Component-based architecture

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.# mortgage-app
