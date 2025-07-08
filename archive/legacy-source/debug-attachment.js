// Quick debug script to test attachment logic
const filename = 'malware.exe';
const contentType = 'application/x-executable';
const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
const suspiciousTypes = ['application/x-msdownload', 'application/x-executable'];

const extension = '.' + filename.toLowerCase().split('.').pop();
console.log('Filename:', filename);
console.log('Extension:', extension);
console.log('Dangerous extensions:', dangerousExtensions);
console.log('Includes check:', dangerousExtensions.includes(extension));

console.log('Content type:', contentType);
console.log('Suspicious types:', suspiciousTypes);
console.log('Type includes check:', suspiciousTypes.includes(contentType.toLowerCase()));
