const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from src directory
app.use(express.static(path.join(__dirname, 'src')));

// API endpoint for portfolio data
app.get('/api/portfolio', (req, res) => {
  res.json({
    name: 'Your Name',
    title: 'Frontend Developer',
    bio: 'A passionate developer creating amazing web experiences.',
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Vue'],
    projects: [
      {
        id: 1,
        title: 'Project 1',
        description: 'Description of project 1',
        image: 'assets/project1.jpg',
        link: '#'
      },
      {
        id: 2,
        title: 'Project 2',
        description: 'Description of project 2',
        image: 'assets/project2.jpg',
        link: '#'
      }
    ]
  });
});

// Serve index.html for all routes (SPA routing)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});