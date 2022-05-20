function createSeededRandom(seed = 0) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

const random = createSeededRandom();

const LIMIT = 1_000_000;
let sum =  0;
for (let i = 0; i < LIMIT; i++) {
  sum += random();
}
console.log(sum/LIMIT)

const k = 3

clusters[0][0] = 5
console.log(clusters)