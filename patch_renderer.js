const fs = require('fs');
let code = fs.readFileSync('src/renderer.ts', 'utf8');

code = code.replace(/<<<<<<< HEAD\n  \n=======\n\n>>>>>>> origin\/main\n/g, '  \n');
code = code.replace(/<<<<<<< HEAD\n    \n=======\n\n>>>>>>> origin\/main\n/g, '    \n');

fs.writeFileSync('src/renderer.ts', code);
