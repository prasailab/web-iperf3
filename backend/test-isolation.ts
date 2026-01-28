import { spawn } from 'child_process';

const wingetPath = 'C:\\Users\\Prasath\\AppData\\Local\\Microsoft\\WinGet\\Links';
const packagePath = 'C:\\Users\\Prasath\\AppData\\Local\\Microsoft\\WinGet\\Packages\\ar51an.iPerf3_Microsoft.Winget.Source_8wekyb3d8bbwe';
process.env.PATH = `${wingetPath};${packagePath};${process.env.PATH}`;

console.log('Testing iperf3 execution with specific args...');
console.log('PATH length:', process.env.PATH.length);

// Args from user screenshot/default: -c 217.161.120.178 -4 -p 5201 -t 10 -P 2 --forceflush
const args = ['-c', '217.161.120.178', '-4', '-p', '5201', '-t', '10', '-P', '2', '--forceflush'];
console.log('Running:', 'iperf3', args.join(' '));

const child = spawn('iperf3', args);

child.stdout.on('data', (data) => {
    console.log('STDOUT:', data.toString());
});

child.stderr.on('data', (data) => {
    console.log('STDERR:', data.toString());
});

child.on('error', (err) => {
    console.error('SPAWN ERROR:', err);
});

child.on('close', (code) => {
    console.log('Process exited with code:', code);
});
