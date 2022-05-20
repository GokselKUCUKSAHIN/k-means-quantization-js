// *************************************************
// * Constants
// *************************************************

const MAX_K_MEANS_PIXELS = 50000;

//*************************************************
//* Image/Data Processing
//*************************************************

/**
 * <p>
 *   Checks for equality of elements in two arrays.
 * </p>
 * @param arr1
 * @param arr2
 * @returns {boolean}
 */
function isArrayEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) if (arr1[i] !== arr2[i]) return false;
  return true;
}

/**
 * <p>
 *  Given width w and height h, rescale the dimensions to satisfy
 *  the specified number of pixels.
 * </p>
 * @param w {number}
 * @param h {number}
 * @param pixels {number}
 * @returns {[number, number]}
 */
function rescaleDimensions(w, h, pixels) {
  const aspectRatio = w / h;
  const scalingFactor = Math.sqrt(pixels / aspectRatio);
  const rescaledW = Math.floor(aspectRatio * scalingFactor);
  const rescaledH = Math.floor(scalingFactor);
  return [rescaledW, rescaledH];
}

/**
 * <p>
 *   Given an Image, return a dataset with pixel colors.
 *   If resized_pixels > 0, image will be resized prior to building
 *   the dataset.
 *   return: [[R,G,B,a], [R,G,B,a], [R,G,B,a], ...]
 * </p>
 * @param img
 * @param resizedPixels
 * @returns {Array<[number, number, number, number]>}
 */
function getPixelDataset(img, resizedPixels) {
  if (resizedPixels === undefined) resizedPixels = -1;
  // Get pixel colors from a <canvas> with the image
  const canvas = document.createElement("canvas");
  const imgNPixels = img.width * img.height;
  let canvasWidth = img.width;
  let canvasHeight = img.height;
  if (resizedPixels > 0 && imgNPixels > resizedPixels) {
    const rescaled = rescaleDimensions(img.width, img.height, resizedPixels)
    canvasWidth = rescaled[0];
    canvasHeight = rescaled[1];
  }
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const canvasNPixels = canvasWidth * canvasHeight;
  const context = canvas.getContext("2d");
  context.drawImage(img, 0, 0, canvasWidth, canvasHeight);
  const flattenedDataset = context.getImageData(
    0, 0, canvasWidth, canvasHeight).data;
  const nChannels = flattenedDataset.length / canvasNPixels;
  const dataset = [];
  for (let i = 0; i < flattenedDataset.length; i += nChannels) {
    dataset.push(flattenedDataset.slice(i, i + nChannels));
  }
  return dataset;
}

/**
 * <p>
 *   Given a point and a list of neighbor points, return the index
 *   for the neighbor that's closest to the point.
 * </p>
 * @param point
 * @param neighbors
 * @returns {number}
 */
function nearestNeighbor(point, neighbors) {
  let best_dist = Infinity; // squared distance
  let best_index = -1;
  for (let i = 0; i < neighbors.length; i++) {
    const neighbor = neighbors[i];
    let dist = 0;
    for (let j = 0; j < point.length; j++) {
      dist += Math.pow(point[j] - neighbor[j], 2);
    }
    if (dist < best_dist) {
      best_dist = dist;
      best_index = i;
    }
  }
  return best_index;
}

/**
 * <p>
 *   Returns the centroid of a dataset.
 * </p>
 * @param dataset
 * @returns {*[]}
 */
function centroid(dataset) {
  if (dataset.length === 0) return [];
  // Calculate running means.
  const runningCentroid = [];
  for (let i = 0; i < dataset[0].length; i++) {
    runningCentroid.push(0);
  }
  for (let i = 0; i < dataset.length; i++) {
    const point = dataset[i];
    for (let j = 0; j < point.length; j++) {
      runningCentroid[j] += (point[j] - runningCentroid[j]) / (i + 1);
    }
  }
  return runningCentroid;
}


function createSeededRandom(seed = 0) {
  return function () {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * <p>
 *   Returns the k-means centroids.
 * </p>
 * @param dataset
 * @param k
 * @returns {[]}
 */
function kMeans(dataset, k) {
  if (k === undefined) k = Math.min(3, dataset.length);
  // Use a seeded random number generator instead of Math.random(),
  // so that k-means always produces the same centroids for the same input.
  const random = createSeededRandom();
  // Choose initial centroids randomly.
  const centroids = [];
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(random() * dataset.length);
    centroids.push(dataset[idx]);
  }
  while (true) {
    // 'clusters' is an array of arrays. each sub-array corresponds to
    // a cluster, and has the points in that cluster.
    const clusters = [...Array(k)].map(_ => []);
    for (let i = 0; i < dataset.length; i++) {
      const point = dataset[i];
      const nearest_centroid = nearestNeighbor(point, centroids);
      clusters[nearest_centroid].push(point);
    }
    let converged = true;
    for (let i = 0; i < k; i++) {
      const cluster = clusters[i];
      let centroid_i = [];
      if (cluster.length > 0) {
        centroid_i = centroid(cluster);
      } else {
        // For an empty cluster, set a random point as the centroid.
        const idx = Math.floor(random() * dataset.length);
        centroid_i = dataset[idx];
      }
      converged = converged && isArrayEqual(centroid_i, centroids[i]);
      centroids[i] = centroid_i;
    }
    if (converged) break;
  }
  return centroids;
}

// Takes an <img> as input. Returns a quantized data URL.
var quantize = function(img, colors) {
  var width = img.width;
  var height = img.height;
  var source_canvas = document.createElement("canvas");
  source_canvas.width = width;
  source_canvas.height = height;
  var source_context = source_canvas.getContext("2d");
  source_context.drawImage(img, 0, 0, width, height);

  // flattened_*_data = [R, G, B, a, R, G, B, a, ...] where
  // (R, G, B, a) groups each correspond to a single pixel, and they are
  // column-major ordered.
  var flattened_source_data = source_context.getImageData(
    0, 0, width, height).data;
  var n_pixels = width * height;
  var n_channels = flattened_source_data.length / n_pixels;

  var flattened_quantized_data = new Uint8ClampedArray(
    flattened_source_data.length);

  // Set each pixel to its nearest color.
  var current_pixel = new Uint8ClampedArray(n_channels);
  for (var i = 0; i < flattened_source_data.length; i += n_channels) {
    // This for loop approach is faster than using Array.slice().
    for (var j = 0; j < n_channels; ++j) {
      current_pixel[j] = flattened_source_data[i + j];
    }
    var nearest_color_index = nearestNeighbor(current_pixel, colors);
    var nearest_color = centroids[nearest_color_index];
    for (var j = 0; j < nearest_color.length; ++j) {
      flattened_quantized_data[i+j] = nearest_color[j];
    }
  }

  var quantized_canvas = document.createElement("canvas");
  quantized_canvas.width = width;
  quantized_canvas.height = height;
  var quantized_context = quantized_canvas.getContext("2d");

  var image = quantized_context.createImageData(width, height);
  image.data.set(flattened_quantized_data);
  quantized_context.putImageData(image, 0, 0);
  data_url = quantized_canvas.toDataURL();
  return data_url;
};

// *************************************************
// * HTML
// *************************************************

// HTML Elements
const inputFileElement = document.getElementById("input_file");
const quantizeBtnElement = document.getElementById("quantize_btn");
const kSelectionsElement = document.getElementById("k_selections");
const statusElement = document.getElementById("status");
const quantizedImgElement = document.getElementById("quantized_img");
const modalElement = document.getElementById('modal');
const closeElement = document.getElementById("close");

const ESC_KEYCODE = 27;

const MODAL_HIDDEN_STYLE = "none";
const MODAL_SHOWN_STYLE = "block";

function hideModal() {
  modalElement.style.display = MODAL_HIDDEN_STYLE;
}

function showModal() {
  modalElement.style.display = MODAL_SHOWN_STYLE;
}

function modalIsShown() {
  return modalElement.style.display === MODAL_SHOWN_STYLE;
}

closeElement.onclick = function () {
  hideModal();
};

modalElement.onclick = function () {
  hideModal();
};

document.addEventListener('keyup', function (event) {
  if (event.key === ESC_KEYCODE && modalIsShown()) {
    hideModal();
  }
});

quantizedImgElement.onclick = function (event) {
  // Prevent the click from being passed to the modal element.
  event.stopPropagation();
};

// Fill k selections.
const kOptions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24];
const defaultK = 3;
for (let i = 0; i < kOptions.length; i++) {
  const k = kOptions[i];
  const optionElement = document.createElement("option");
  optionElement.value = k;
  optionElement.textContent = k;
  kSelectionsElement.appendChild(optionElement);
  if (k === defaultK) kSelectionsElement.selectedIndex = i;
}

// Enable the quantize button if a file has been selected, and
// disable otherwise.
function setQuantizeButton() {
  files = inputFileElement.files;
  quantizeBtnElement.disabled = !files || !files.length;
}

inputFileElement.addEventListener("change", setQuantizeButton);
window.addEventListener("load", setQuantizeButton);

function preQuantize() {
  // Clear any existing image.
  if (quantizedImgElement.hasAttribute("src")) {
    quantizedImgElement.removeAttribute("src");
  }
  quantizeBtnElement.disabled = true;
  inputFileElement.disabled = true;
  kSelectionsElement.disabled = true;
  statusElement.textContent = "Processing...";
}

function postQuantize() {
  quantizeBtnElement.disabled = false;
  inputFileElement.disabled = false;
  kSelectionsElement.disabled = false;
  statusElement.textContent = "";
}

// Handle "Quantize" button.
quantizeBtnElement.addEventListener("click", function() {
  files = inputFileElement.files;
  if (!FileReader || !files || !files.length) return;
  var quantized_img = document.getElementById("quantized_img");
  var reader = new FileReader();
  reader.addEventListener("load", function() {
    var k = parseInt(kSelectionsElement.value);
    var img = new Image();
    img.onload = function() {
      // Use a combination of requestAnimationFrame and setTimeout
      // to run quantize/post_quantize after the next repaint, which is
      // triggered by pre_quantize().
      requestAnimationFrame(function() {
        setTimeout(function() {
          // Use a fixed maximum so that k-means works fast.
          var pixel_dataset = getPixelDataset(img, MAX_K_MEANS_PIXELS);
          var centroids = kMeans(pixel_dataset, k);
          var data_url = quantize(img, centroids);
          quantized_img_element.src = data_url;
          showModal();
          postQuantize();
        }, 0);
      });
      preQuantize();
    };
    img.src = reader.result;
  });
  reader.readAsDataURL(files[0]);
});
