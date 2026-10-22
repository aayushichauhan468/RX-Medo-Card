/**
 * Rx Medo Card - Shared Site Footer Component Loader
 * Dynamically loads and mounts the centralized footer.html into #siteFooterMount.
 * Supports root directory pages as well as subfolder pages (e.g., cards/).
 */
(() => {
  // Prevent duplicate execution
  if (window.__rxFooterInitialized) return;
  window.__rxFooterInitialized = true;

  // Determine root directory and relative prefix
  const script = document.currentScript;
  const scriptSrc = script ? script.src : '';
  const root = scriptSrc ? new URL('../', scriptSrc) : new URL('./', window.location.href);
  const rootPath = window.location.pathname.replace(/\\/g, '/');
  const onCardsPage = /\/cards\/[^/]*$/i.test(rootPath);
  const prefix = onCardsPage ? '../' : './';

  const mountFooter = (html) => {
    // Replace __ROOT__ placeholder with appropriate prefix
    let processedHtml = html.replaceAll('__ROOT__', prefix);

    // If on a subfolder page (e.g. cards/), ensure relative image/link paths without __ROOT__ are also safely adjusted
    if (onCardsPage) {
      processedHtml = processedHtml
        .replace(/(src|href)=["'](images\/[^"']+)["']/g, '$1="../$2"')
        .replace(/(href)=["']((?:index|Offers|Hospitals|OPD|Pharmacy|Diagnostics|signup|Membership|seniorshield|cancle|shipping|policies|terms|refund)\.html[^"']*)["']/g, '$1="../$2"');
    }

    const mount = document.getElementById('siteFooterMount');
    if (mount) {
      mount.innerHTML = processedHtml;

      // Update current copyright year if element exists
      const yearSpan = mount.querySelector('#rxFooterCurrentYear');
      if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
      }
    }
  };

  // Fetch footer.html via HTTP
  const footerUrl = new URL('footer.html', root).href;
  fetch(footerUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Footer request failed with status: ${response.status}`);
      return response.text();
    })
    .then((html) => {
      mountFooter(html);
    })
    .catch((error) => {
      // Graceful fallback for file:// protocol or offline testing
      const fallbackHtml = `
<footer class="footer-modern-ref" id="rxSiteFooter" role="contentinfo" aria-label="Rx Medo Card Site Footer">
  <div class="footer-container">
    <div class="footer-grid">

      <!-- Column 1: Brand -->
      <div class="footer-col footer-col-brand">
        <div class="footer-brand-header">
          <img src="__ROOT__images/logo.ico" alt="Rx Medo Card Logo" class="footer-logo-img" width="56" height="56" loading="lazy" onerror="this.onerror=null;this.src='__ROOT__images/logo.webp';">
          <div class="footer-brand-text">
            <h2 class="footer-brand-title">Rx Medo Card</h2>
            <div class="footer-brand-subtitle">AN INITIATIVE OF RX MEDICAL TRUST</div>
          </div>
        </div>

        <p class="footer-description">
          Rx Medo Card is a healthcare discount program designed to make quality healthcare accessible and affordable for everyone.
        </p>

        <div class="footer-tagline">
          Your Health, Our Priority
        </div>

        <div>
          <a href="__ROOT__signup.html" class="footer-btn-primary">Get Your Card</a>
        </div>
      </div>

      <!-- Column 2: Quick Links -->
      <div class="footer-col">
        <h4 class="footer-col-heading">Quick Links</h4>
        <div class="footer-heading-bar" aria-hidden="true"></div>
        <ul class="footer-links-list">
          <li><a href="__ROOT__index.html">Home</a></li>
          <li><a href="__ROOT__Offers.html">Card Details</a></li>
          <li><a href="__ROOT__Hospitals.html">Hospitals</a></li>
          <li><a href="__ROOT__OPD.html">OPD</a></li>
          <li><a href="__ROOT__Pharmacy.html">Pharmacy</a></li>
          <li><a href="__ROOT__Diagnostics.html">Diagnostics</a></li>
        </ul>
      </div>

      <!-- Column 3: Our Services -->
      <div class="footer-col">
        <h4 class="footer-col-heading">Our Services</h4>
        <div class="footer-heading-bar" aria-hidden="true"></div>
        <ul class="footer-links-list">
          <li><a href="#">Family Physician</a></li>
          <li><a href="#">Specialist Consultations</a></li>
          <li><a href="__ROOT__Diagnostics.html">Diagnostic Tests</a></li>
          <li><a href="#">Hospital Packages</a></li>
          <li><a href="__ROOT__seniorshield.html">Senior Care</a></li>
          <li><a href="__ROOT__cancle.html">Cancellation &amp; Refund Policy</a></li>
          <li><a href="__ROOT__shipping.html">Shipping &amp; Delivery Policy</a></li>
        </ul>
      </div>

      <!-- Column 4: Contact Us -->
      <div class="footer-col footer-col-contact">
        <h4 class="footer-col-heading">Contact Us</h4>
        <div class="footer-heading-bar" aria-hidden="true"></div>
        <div class="footer-contact-items">
          <a href="tel:+919999307517" class="footer-contact-item">
            <i class="bi bi-telephone footer-contact-icon" aria-hidden="true"></i>
            <span>+91 9999307517</span>
          </a>
          <a href="mailto:info@rxmedocard.com" class="footer-contact-item">
            <i class="bi bi-envelope footer-contact-icon" aria-hidden="true"></i>
            <span>info@rxmedocard.com</span>
          </a>
          <div class="footer-contact-item">
            <i class="bi bi-geo-alt footer-contact-icon" aria-hidden="true"></i>
            <span>C Block, Phase2, Industrial Area, Sector 62, Noida, Uttar Pradesh 201309.</span>
          </div>
        </div>

        <!-- Social Icons & Action Buttons Row -->
        <div class="footer-contact-actions">
          <div class="footer-social-icons" aria-label="Social media channels">
            <a href="https://www.facebook.com/share/1BNoh3faPB/" class="footer-social-link" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <i class="bi bi-facebook" aria-hidden="true"></i>
            </a>
            <a href="https://www.instagram.com/rxmedo_card?igsh=bGJjbDMxNHJkNmhr" class="footer-social-link" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i class="bi bi-instagram" aria-hidden="true"></i>
            </a>
            <a href="https://www.linkedin.com/company/rx-medical-trust/" class="footer-social-link" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <i class="bi bi-linkedin" aria-hidden="true"></i>
            </a>
          </div>

          <div class="footer-action-buttons">
            <a href="__ROOT__signup.html" class="footer-btn-card">Get your card</a>
            <a href="__ROOT__challenge.html#dates" class="footer-btn-challenge">Join Marketing Challenge</a>
          </div>
        </div>
      </div>

    </div>

    <!-- Divider -->
    <hr class="footer-bottom-divider" aria-hidden="true">

    <!-- Bottom Bar -->
    <div class="footer-bottom-bar">
      <div class="footer-bottom-copy">
        &copy; <span id="rxFooterCurrentYear">2025</span> - <strong>Rx Medo Card</strong>. All rights reserved.
      </div>
      <div class="footer-bottom-links">
        <a href="__ROOT__policies.html">Privacy Policy</a>
        <a href="__ROOT__terms.html">Terms of Service</a>
        <a href="__ROOT__refund.html">Refund Policy</a>
      </div>
    </div>
  </div>
</footer>

<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">

<style>
  .footer-modern-ref {
    position: relative;
    background-color: #D1EFE6;
    color: #1B2B50;
    font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    padding: 56px 0 28px;
    box-sizing: border-box;
    width: 100%;
    z-index: 20;
    opacity: 1 !important;
    transform: none !important;
    border-top: 1px solid rgba(27, 43, 80, 0.08);
  }

  .footer-modern-ref .footer-container {
    max-width: 1260px;
    margin: 0 auto;
    padding: 0 28px;
    box-sizing: border-box;
  }

  .footer-modern-ref .footer-grid {
    display: grid;
    grid-template-columns: 1.25fr 0.8fr 0.95fr 1.35fr;
    gap: 36px;
    align-items: start;
  }

  .footer-modern-ref .footer-col-brand {
    display: flex;
    flex-direction: column;
  }

  .footer-modern-ref .footer-brand-header {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .footer-modern-ref .footer-logo-img {
    width: 54px;
    height: 54px;
    object-fit: contain;
    flex-shrink: 0;
  }

  .footer-modern-ref .footer-brand-text {
    display: flex;
    flex-direction: column;
  }

  .footer-modern-ref .footer-brand-title {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1B2B50;
    margin: 0;
    line-height: 1.15;
    letter-spacing: -0.01em;
  }

  .footer-modern-ref .footer-brand-subtitle {
    font-size: 0.68rem;
    font-weight: 600;
    color: #165b75;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    margin-top: 4px;
  }

  .footer-modern-ref .footer-description {
    color: #2c426b;
    font-size: 0.92rem;
    line-height: 1.6;
    margin: 16px 0 14px 0;
    max-width: 360px;
  }

  .footer-modern-ref .footer-tagline {
    font-weight: 700;
    color: #1B2B50;
    font-size: 0.98rem;
    margin-bottom: 20px;
    letter-spacing: 0.01em;
  }

  .footer-modern-ref .footer-btn-primary {
    display: inline-block;
    background: #F7C43D;
    color: #1B2B50;
    font-weight: 700;
    font-size: 0.95rem;
    padding: 12px 32px;
    border-radius: 999px;
    text-decoration: none;
    transition: all 0.25s ease;
    box-shadow: 0 4px 14px rgba(247, 196, 61, 0.35);
  }

  .footer-modern-ref .footer-btn-primary:hover {
    background: #E5B32E;
    color: #1B2B50;
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(247, 196, 61, 0.45);
  }

  .footer-modern-ref .footer-col {
    display: flex;
    flex-direction: column;
  }

  .footer-modern-ref .footer-col-heading {
    font-size: 1.15rem;
    font-weight: 700;
    color: #1B2B50;
    margin: 0;
    letter-spacing: 0.01em;
  }

  .footer-modern-ref .footer-heading-bar {
    width: 34px;
    height: 3px;
    background: #F7C43D;
    margin: 8px 0 18px 0;
    border-radius: 2px;
  }

  .footer-modern-ref .footer-links-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .footer-modern-ref .footer-links-list li a {
    color: #2c426b;
    font-size: 0.92rem;
    text-decoration: none;
    transition: all 0.2s ease;
    display: inline-block;
    font-weight: 500;
  }

  .footer-modern-ref .footer-links-list li a:hover {
    color: #1B2B50;
    transform: translateX(3px);
    font-weight: 600;
  }

  .footer-modern-ref .footer-contact-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .footer-modern-ref .footer-contact-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    color: #2c426b;
    font-size: 0.88rem;
    line-height: 1.5;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .footer-modern-ref a.footer-contact-item:hover {
    color: #1B2B50;
  }

  .footer-modern-ref .footer-contact-icon {
    color: #1B2B50;
    font-size: 0.95rem;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .footer-modern-ref .footer-contact-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 22px;
  }

  .footer-modern-ref .footer-social-icons {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .footer-modern-ref .footer-social-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    background: #FFFFFF;
    border: 1px solid rgba(27, 43, 80, 0.12);
    border-radius: 50%;
    color: #1B2B50;
    font-size: 0.95rem;
    text-decoration: none;
    transition: all 0.24s cubic-bezier(0.25, 1, 0.5, 1);
    box-shadow: 0 2px 6px rgba(27, 43, 80, 0.06);
  }

  .footer-modern-ref .footer-social-link:hover {
    background: #7CC4E8;
    color: #1B2B50;
    border-color: #7CC4E8;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(124, 196, 232, 0.4);
  }

  .footer-modern-ref .footer-action-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }

  .footer-modern-ref .footer-btn-card {
    display: inline-block;
    background: #7CC4E8;
    color: #1B2B50;
    font-weight: 700;
    font-size: 0.92rem;
    padding: 10px 24px;
    border-radius: 999px;
    text-decoration: none;
    transition: all 0.25s ease;
    box-shadow: 0 4px 14px rgba(124, 196, 232, 0.35);
    text-align: center;
    white-space: nowrap;
  }

  .footer-modern-ref .footer-btn-card:hover {
    background: #68b8e0;
    color: #1B2B50;
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(124, 196, 232, 0.5);
  }

  .footer-modern-ref .footer-btn-challenge {
    display: inline-block;
    background: #F7C43D;
    color: #1B2B50;
    font-weight: 700;
    font-size: 0.92rem;
    padding: 11px 26px;
    border-radius: 999px;
    text-decoration: none;
    transition: all 0.25s ease;
    box-shadow: 0 4px 14px rgba(247, 196, 61, 0.35);
    text-align: center;
    white-space: nowrap;
  }

  .footer-modern-ref .footer-btn-challenge:hover {
    background: #E5B32E;
    color: #1B2B50;
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(247, 196, 61, 0.45);
  }

  .footer-modern-ref .footer-bottom-divider {
    border: none;
    height: 1px;
    background: rgba(27, 43, 80, 0.12);
    margin: 42px 0 20px 0;
  }

  .footer-modern-ref .footer-bottom-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 0.88rem;
    color: #2c426b;
  }

  .footer-modern-ref .footer-bottom-copy {
    margin: 0;
  }

  .footer-modern-ref .footer-bottom-links {
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
  }

  .footer-modern-ref .footer-bottom-links a {
    color: #2c426b;
    text-decoration: none;
    transition: color 0.2s ease;
  }

  .footer-modern-ref .footer-bottom-links a:hover {
    color: #1B2B50;
    text-decoration: underline;
  }

  @media (max-width: 1100px) {
    .footer-modern-ref .footer-grid {
      grid-template-columns: 1fr 1fr;
      gap: 36px 28px;
    }
  }

  @media (max-width: 767px) {
    .footer-modern-ref {
      padding: 48px 0 84px;
    }

    .footer-modern-ref .footer-container {
      padding: 0 20px;
    }

    .footer-modern-ref .footer-grid {
      grid-template-columns: 1fr;
      gap: 32px;
    }

    .footer-modern-ref .footer-description {
      max-width: 100%;
    }

    .footer-modern-ref .footer-contact-actions {
      flex-direction: column;
      align-items: flex-start;
      gap: 16px;
    }

    .footer-modern-ref .footer-action-buttons {
      align-items: stretch;
      width: 100%;
    }

    .footer-modern-ref .footer-btn-card,
    .footer-modern-ref .footer-btn-challenge {
      width: 100%;
    }

    .footer-modern-ref .footer-bottom-bar {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }

    .footer-modern-ref .footer-bottom-links {
      gap: 16px;
    }
  }
</style>
`;
      mountFooter(fallbackHtml);
    });
})();
