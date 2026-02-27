const DEFAULT_DESCRIPTION =
  "High-purity peptide formulation suitable for research inventory cataloging.";
const SITE_PREFIX = "/pepsite";
const DEFAULT_IMAGE = `${SITE_PREFIX}/assets/generic-peptide.png`;
const OTHER_PRODUCT_VALUE = "__other__";

function withSitePrefix(path) {
  return path.startsWith("/") ? `${SITE_PREFIX}${path}` : path;
}

function updateProductSelect(products) {
  const productSelect = document.getElementById("product-select");
  if (!productSelect) {
    return;
  }

  const previousValue = productSelect.value;
  productSelect.textContent = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Select a product";
  productSelect.append(placeholderOption);

  const productNames = [...new Set(
    products
      .map((item) => (typeof item.name === "string" ? item.name.trim() : ""))
      .filter(Boolean),
  )];

  productNames.sort((a, b) => a.localeCompare(b));

  for (const productName of productNames) {
    const option = document.createElement("option");
    option.value = productName;
    option.textContent = productName;
    productSelect.append(option);
  }

  const otherOption = document.createElement("option");
  otherOption.value = OTHER_PRODUCT_VALUE;
  otherOption.textContent = "Other product";
  productSelect.append(otherOption);

  if (previousValue === OTHER_PRODUCT_VALUE || productNames.includes(previousValue)) {
    productSelect.value = previousValue;
  }
}

function toggleOtherProductField() {
  const productSelect = document.getElementById("product-select");
  const otherProductField = document.getElementById("other-product-field");
  const otherProductInput = document.getElementById("other-product");

  if (!productSelect || !otherProductField || !otherProductInput) {
    return;
  }

  const isOtherProduct = productSelect.value === OTHER_PRODUCT_VALUE;
  otherProductField.hidden = !isOtherProduct;
  otherProductInput.required = isOtherProduct;

  if (!isOtherProduct) {
    otherProductInput.value = "";
    otherProductInput.setCustomValidity("");
  }
}

function syncContactMethodValidity() {
  const emailInput = document.getElementById("contact-email");
  const phoneInput = document.getElementById("contact-phone");

  if (!emailInput || !phoneInput) {
    return true;
  }

  const hasEmail = emailInput.value.trim() !== "";
  const hasPhone = phoneInput.value.trim() !== "";
  const message =
    hasEmail || hasPhone ? "" : "Please provide an email address or phone number.";

  emailInput.setCustomValidity(message);
  phoneInput.setCustomValidity(message);

  return message === "";
}

function initContactForm() {
  const form = document.getElementById("contact-form");
  const productSelect = document.getElementById("product-select");
  const otherProductInput = document.getElementById("other-product");
  const emailInput = document.getElementById("contact-email");
  const phoneInput = document.getElementById("contact-phone");
  const thanksEl = document.getElementById("contact-thanks");
  const errorEl = document.getElementById("contact-error");

  if (
    !form ||
    !productSelect ||
    !otherProductInput ||
    !emailInput ||
    !phoneInput ||
    !thanksEl ||
    !errorEl
  ) {
    return;
  }

  updateProductSelect([]);
  toggleOtherProductField();

  productSelect.addEventListener("change", toggleOtherProductField);
  emailInput.addEventListener("input", syncContactMethodValidity);
  phoneInput.addEventListener("input", syncContactMethodValidity);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    thanksEl.hidden = true;
    errorEl.hidden = true;
    errorEl.textContent = "";

    const isContactMethodValid = syncContactMethodValidity();
    if (!isContactMethodValid) {
      form.reportValidity();
      return;
    }

    const selectedProduct = productSelect.value;
    if (selectedProduct === OTHER_PRODUCT_VALUE && !otherProductInput.value.trim()) {
      otherProductInput.setCustomValidity("Please enter the product name.");
      form.reportValidity();
      return;
    }
    otherProductInput.setCustomValidity("");

    const submitButton = form.querySelector('button[type="submit"]');
    const defaultButtonText = submitButton ? submitButton.textContent : "";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
    }

    const formData = new FormData(form);
    const productInterest =
      selectedProduct === OTHER_PRODUCT_VALUE ? otherProductInput.value.trim() : selectedProduct;

    formData.set("product_interest", productInterest);
    formData.delete("product_select");
    if (selectedProduct !== OTHER_PRODUCT_VALUE) {
      formData.delete("other_product");
    }

    try {
      const response = await fetch(form.action, {
        method: form.method,
        headers: { Accept: "application/json" },
        body: formData,
      });

      if (response.ok) {
        form.reset();
        toggleOtherProductField();
        thanksEl.hidden = false;
      } else {
        const data = await response.json().catch(() => null);
        const responseError =
          data && Array.isArray(data.errors)
            ? data.errors.map((item) => item.message).join(" ")
            : "";

        errorEl.textContent = responseError || "Unable to submit right now. Please try again.";
        errorEl.hidden = false;
      }
    } catch (error) {
      errorEl.textContent = "Unable to submit right now. Please try again.";
      errorEl.hidden = false;
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = defaultButtonText;
      }
    }
  });
}

async function loadInventory() {
  const statusEl = document.getElementById("status");
  const gridEl = document.getElementById("inventory-grid");

  try {
    const response = await fetch(`${SITE_PREFIX}/data/inventory.json`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const products = Array.isArray(payload.products) ? payload.products : [];
    updateProductSelect(products);
    toggleOtherProductField();

    if (!products.length) {
      statusEl.textContent = "No products found in inventory JSON.";
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const item of products) {
      const card = document.createElement("article");
      card.className = "card";

      const image = document.createElement("img");
      image.src = item.image ? withSitePrefix(item.image) : DEFAULT_IMAGE;
      image.alt = `${item.name || "Peptide product"} image`;
      image.loading = "lazy";
      image.onerror = () => {
        image.onerror = null;
        image.src = DEFAULT_IMAGE;
      };

      const body = document.createElement("div");
      body.className = "card-body";

      const title = document.createElement("h2");
      title.className = "product-name";
      title.textContent = item.name || "Unnamed Product";

      const id = document.createElement("div");
      id.className = "product-id";
      id.textContent = item.sku ? `SKU: ${item.sku}` : "SKU not set";

      const desc = document.createElement("p");
      desc.className = "product-description";
      desc.textContent = item.description || DEFAULT_DESCRIPTION;

      const stockRow = document.createElement("div");
      stockRow.className = "stock-row";

      const stockCount = Number.isFinite(item.stock) ? item.stock : 0;
      const stockLabel = document.createElement("strong");
      stockLabel.textContent = `${stockCount} in stock`;

      const availability = document.createElement("span");
      availability.className = `stock-pill${stockCount > 0 ? "" : " out"}`;
      availability.textContent = stockCount > 0 ? "Available" : "Out of Stock";

      stockRow.append(stockLabel, availability);
      body.append(title, id, desc, stockRow);
      card.append(image, body);
      fragment.append(card);
    }

    gridEl.append(fragment);
    statusEl.textContent = "";
  } catch (error) {
    statusEl.textContent =
      "Unable to load inventory JSON. Ensure the site is served from a static web server.";
  }
}

initContactForm();
loadInventory();
