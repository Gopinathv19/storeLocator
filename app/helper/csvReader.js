import Papa from 'papaparse';

export default async function csvReader(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true, // Assumes the first row is the header
            complete: (results) => {
                resolve(results.data);
            },
            error: (error) => {
                console.error('Error reading file:', error);
                reject(error);
            }
        });
    });
}

 

