// Array cu vehiculele specificate
const vehicles = [
  402,
  417,
  423,
  450,
  408,
  999,
  407,
  420,
  415,
  409,
  55,
  404,
  400,
  996,
  403,
  401,
  411,
  998,
  413,
  414,
  418,
  419
];

// Array ca string pentru copy-paste rapid
const vehiclesString = "402,417,423,450,408,999,407,420,415,409,55,404,400,996,403,401,411,998,413,414,418,419";

// Export pentru utilizare în alte fișiere
module.exports = { vehicles, vehiclesString };

console.log("Vehicles array:", vehicles);
console.log("Total vehicles:", vehicles.length);
console.log("As comma-separated string:", vehiclesString);