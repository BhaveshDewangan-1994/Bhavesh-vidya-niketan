/**
 * भावेश विद्या निकेतन | BHAVESH VIDYA NIKETAN
 * Frontend Engine & Micro-Interactions (Vanilla JavaScript)
 * Upgraded for SEO, Performance, Web3Forms, Zero-Lag YouTube, & School ERP Modal
 */

/* --------------------------------------------------------------------------
   Supabase Database Backend Initialization (Notice Board API)
   -------------------------------------------------------------------------- */
const SUPABASE_URL = "https://cfnwqvbinndatfultvgn.supabase.co";
const SUPABASE_KEY = "sb_publishable_aVohEYyuf7ecGan46pjhbQ_6EAsK9Cp";
var supabase = (window.supabase && typeof window.supabase.createClient === 'function')
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : (typeof window !== 'undefined' && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null);

/**
 * Dynamic Notice Board Engine: Fetches live notices from Supabase 'notices' table
 * Renders title, details, and tag dynamically; gracefully keeps fallback content on error/empty.
 */
async function loadSchoolNotices() {
  const noticesContainer = document.getElementById('dynamic-notices');
  if (!noticesContainer) return;

  try {
    // 1. Read notices from local storage first (immediate and offline-ready)
    let localNotices = [];
    try {
      localNotices = JSON.parse(localStorage.getItem('bvn_notices_local') || '[]');
      if (!Array.isArray(localNotices)) localNotices = [];
    } catch (e) {
      localNotices = [];
    }

    // 2. Attempt fetching from Supabase cloud
    let cloudNotices = [];
    try {
      if (!supabase && window.supabase && typeof window.supabase.createClient === 'function') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      }
      if (supabase) {
        const { data, error } = await supabase
          .from('notices')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          cloudNotices = data;
        }
      }
    } catch (sbErr) {
      console.warn("Supabase notice fetch note (using local cache):", sbErr);
    }

    // 3. Merge notices: local entries take priority, avoid duplicates
    const mergedMap = new Map();
    localNotices.forEach(n => mergedMap.set(String(n.id || n.title), n));
    cloudNotices.forEach(n => {
      const key = String(n.id || n.title);
      if (!mergedMap.has(key)) {
        mergedMap.set(key, n);
      }
    });

    const data = Array.from(mergedMap.values());
    data.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (!data || data.length === 0) {
      console.info("No notices found; keeping fallback notices visible.");
      return; // Keep existing fallback content visible
    }

    // Loop through the data and dynamically render cards showing: title, details, and tag
    noticesContainer.innerHTML = data.map((item, index) => {
      let day = "23";
      let mon = "OCT 2026";
      if (item.created_at) {
        try {
          const d = new Date(item.created_at);
          if (!isNaN(d.getTime())) {
            day = String(d.getDate()).padStart(2, '0');
            mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase() + ' ' + d.getFullYear();
          }
        } catch (e) {}
      }

      const title = item.title || "विद्यालय सूचना";
      const details = item.details || "";
      const tag = item.tag || "सूचना";
      const isUrgent = index === 0;

      return `
        <article class="notice-item-card ${isUrgent ? 'notice-priority-urgent' : ''}">
          <div class="notice-item-left">
            <span class="notice-date-badge">
              <span class="nd-day">${day}</span>
              <span class="nd-mon">${mon}</span>
            </span>
          </div>
          <div class="notice-item-center">
            <div class="notice-tags">
              <span class="notice-tag ${isUrgent ? 'tag-urgent' : 'tag-new'}">
                <i class="fa-solid ${isUrgent ? 'fa-triangle-exclamation' : 'fa-sparkles'}"></i> ${tag}
              </span>
            </div>
            <h4 class="notice-title">${title}</h4>
            <p class="notice-excerpt">${details}</p>
          </div>
          <div class="notice-item-right">
            <a href="#admission-section" class="btn btn-gold btn-sm notice-action-btn">
              <i class="fa-solid fa-file-signature"></i> विवरण देखें / आवेदन
            </a>
          </div>
        </article>
      `;
    }).join('');

    // Wire up action links inside dynamically injected notices
    const actionLinks = noticesContainer.querySelectorAll('.notice-action-btn');
    actionLinks.forEach(link => {
      link.addEventListener('click', () => {
        const modal = document.getElementById('noticeBoardModal');
        if (modal) {
          modal.classList.remove('is-open');
          modal.setAttribute('aria-hidden', 'true');
          document.body.style.overflow = '';
        }
      });
    });
  } catch (err) {
    console.warn("Failed to load school notices dynamically:", err);
    // Keep existing fallback content visible if network fails
  }
}

/**
 * Helper: Escapes HTML strings to prevent XSS
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Helper: Maps category names to FontAwesome icons
 */
function getGalleryCategoryIcon(cat) {
  if (!cat) return 'fa-camera-retro';
  const c = cat.toLowerCase();
  if (c.includes('atl') || c.includes('टिंकरिंग')) return 'fa-robot';
  if (c.includes('खेल') || c.includes('मैदान')) return 'fa-futbol';
  if (c.includes('वार्षिकोत्सव') || c.includes('प्रतिभा') || c.includes('उत्सव')) return 'fa-masks-theater';
  if (c.includes('विज्ञान') || c.includes('प्रयोगशाला')) return 'fa-flask';
  if (c.includes('लाइब्रेरी')) return 'fa-book-open-reader';
  if (c.includes('स्मार्ट')) return 'fa-chalkboard-user';
  if (c.includes('कार्यक्रम') || c.includes('सेमिनार')) return 'fa-champagne-glasses';
  return 'fa-camera-retro';
}

/**
 * Category Matching Helper: Robust matching for Hindi categories & fallback slugs
 */
function matchGalleryCategory(itemCat, filterCat) {
  if (!filterCat || filterCat === 'all' || filterCat === 'सभी' || filterCat.startsWith('सभी')) {
    return true;
  }
  if (!itemCat) return false;
  
  const normItem = itemCat.trim().toLowerCase();
  const normFilter = filterCat.trim().toLowerCase();

  if (normItem === normFilter) return true;

  // Keyword / Substring Matching
  if (normFilter.includes('atl') || normFilter.includes('टिंकरिंग')) {
    return normItem.includes('atl') || normItem.includes('टिंकरिंग') || normItem === 'labs';
  }
  if (normFilter.includes('खेल') || normFilter.includes('मैदान')) {
    return normItem.includes('खेल') || normItem.includes('मैदान') || normItem === 'sports';
  }
  if (normFilter.includes('वार्षिकोत्सव') || normFilter.includes('प्रतिभा') || normFilter.includes('उत्सव')) {
    return normItem.includes('वार्षिकोत्सव') || normItem.includes('प्रतिभा') || normItem.includes('उत्सव') || normItem === 'cultural';
  }
  if (normFilter.includes('विज्ञान') || normFilter.includes('प्रयोगशाला')) {
    return normItem.includes('विज्ञान') || normItem.includes('प्रयोगशाला') || normItem === 'science' || normItem === 'labs';
  }
  if (normFilter.includes('लाइब्रेरी') || normFilter.includes('library')) {
    return normItem.includes('लाइब्रेरी') || normItem.includes('library') || normItem === 'campus';
  }
  if (normFilter.includes('स्मार्ट क्लास') || normFilter.includes('smartclass')) {
    return normItem.includes('स्मार्ट क्लास') || normItem.includes('smartclass') || normItem === 'campus';
  }
  if (normFilter.includes('अन्य') || normFilter.includes('सेमिनार') || normFilter.includes('कार्यक्रम')) {
    return normItem.includes('अन्य') || normItem.includes('सेमिनार') || normItem.includes('कार्यक्रम');
  }

  return false;
}

/**
 * Dynamic Photo Gallery Engine: Fetches live photos from Supabase 'gallery' table
 * Renders thumbnail, title, and category badge; gracefully keeps fallback content if empty/offline.
 */
async function loadSchoolGallery() {
  const galleryGrid = document.getElementById('galleryGrid');
  if (!galleryGrid) return;

  try {
    // 1. Read local photos from localStorage first
    let localPhotos = [];
    try {
      localPhotos = JSON.parse(localStorage.getItem('bvn_gallery_local') || '[]');
      if (!Array.isArray(localPhotos)) localPhotos = [];
    } catch (e) {
      localPhotos = [];
    }

    // 2. Attempt fetching from Supabase cloud
    let cloudPhotos = [];
    try {
      if (!supabase && window.supabase && typeof window.supabase.createClient === 'function') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      }
      if (supabase) {
        const { data, error } = await supabase
          .from('gallery')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          cloudPhotos = data;
        }
      }
    } catch (sbErr) {
      console.warn("Supabase gallery fetch note (using local cache):", sbErr);
    }

    // 3. Merge: Local photos take priority, avoid duplicates
    const mergedMap = new Map();
    localPhotos.forEach(p => mergedMap.set(String(p.id || p.title), p));
    cloudPhotos.forEach(p => {
      const key = String(p.id || p.title);
      if (!mergedMap.has(key)) {
        mergedMap.set(key, p);
      }
    });

    const photos = Array.from(mergedMap.values());
    photos.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (!photos || photos.length === 0) {
      console.info("No custom gallery photos found; keeping fallback static gallery.");
      return; // Keep existing fallback content visible
    }

    // Dynamically render cards showing: image_url, title, category badge, data-category attribute
    galleryGrid.innerHTML = photos.map((photo) => {
      const title = photo.title || "विद्यालय गतिविधि";
      const category = photo.category || "अन्य कार्यक्रम व सेमिनार";
      const imgUrl = photo.image_url || "assets/images/logo.png";
      const iconClass = getGalleryCategoryIcon(category);

      return `
        <div class="gallery-item" data-category="${escapeHTML(category)}">
          <div class="gallery-card">
            <div class="gallery-card-visual" style="background-image: linear-gradient(135deg, rgba(8, 24, 43, 0.35) 0%, rgba(4, 13, 24, 0.75) 100%), url('${imgUrl}');">
              <div class="gallery-overlay">
                <span class="gallery-tag"><i class="fa-solid ${iconClass}"></i> ${escapeHTML(category)}</span>
                <h4 class="gallery-title">${escapeHTML(title)}</h4>
                <p class="gallery-desc">भावेश विद्या निकेतन परिसर</p>
                <button type="button" class="gallery-zoom-btn" aria-label="बड़ा करके देखें"
                  data-img-url="${imgUrl}"
                  data-img-title="${escapeHTML(title)}" 
                  data-img-desc="भावेश विद्या निकेतन, कांकेर" 
                  data-img-cat="${escapeHTML(category)}">
                  <i class="fa-solid fa-magnifying-glass-plus"></i> देखें
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Re-bind zoom button events for dynamic cards
    if (typeof window.bindGalleryZoomEvents === 'function') {
      window.bindGalleryZoomEvents();
    }
    // Re-apply currently active category filter
    if (typeof window.applyActiveGalleryFilter === 'function') {
      window.applyActiveGalleryFilter();
    }

  } catch (err) {
    console.warn("Failed to load school gallery dynamically:", err);
    // Keep existing fallback content visible
  }
}

// Call loadSchoolNotices & loadSchoolGallery on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadSchoolNotices();
    loadSchoolGallery();
  });
} else {
  loadSchoolNotices();
  loadSchoolGallery();
}

/* --------------------------------------------------------------------------
   Feature 1: Robust Image Error Handler & SVG Fallback Placeholder (Early Initializer)
   -------------------------------------------------------------------------- */
const FALLBACK_SCHOOL_SVG = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800 600" width="100%" height="100%">
    <defs>
      <linearGradient id="bvnBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#040D18"/>
        <stop offset="50%" stop-color="#0B192C"/>
        <stop offset="100%" stop-color="#08182B"/>
      </linearGradient>
      <radialGradient id="bvnGlow" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#D4AF37" stop-opacity="0.32"/>
        <stop offset="60%" stop-color="#F59E0B" stop-opacity="0.10"/>
        <stop offset="100%" stop-color="#0B192C" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="50%" stop-color="#ffffff" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="800" height="600" fill="url(#bvnBg)"/>
    <rect width="800" height="600" fill="url(#bvnGlow)"/>
    <rect width="800" height="600" fill="url(#shimmer)"/>
    <rect x="24" y="24" width="752" height="552" rx="16" fill="none" stroke="#D4AF37" stroke-width="2" stroke-opacity="0.35" stroke-dasharray="8 6"/>
    <image href="assets/images/logo.png" xlink:href="assets/images/logo.png" x="285" y="105" width="230" height="230" preserveAspectRatio="xMidYMid meet"/>
    <text x="400" y="405" font-family="'Noto Sans Devanagari', 'Rozha One', serif, sans-serif" font-size="34" font-weight="bold" fill="#FEF08A" text-anchor="middle">भावेश विद्या निकेतन</text>
    <text x="400" y="445" font-family="'Cinzel', serif, sans-serif" font-size="16" font-weight="600" fill="#D4AF37" text-anchor="middle" letter-spacing="4">BHAVESH VIDYA NIKETAN</text>
    <text x="400" y="485" font-family="'Noto Sans Devanagari', sans-serif" font-size="14" fill="#94A3B8" text-anchor="middle">ज्ञान से संस्कार, संस्कार से सफलता | सत्र 2027-28</text>
  </svg>`.trim()
);

window.BVN_FALLBACK_SVG = FALLBACK_SCHOOL_SVG;

window.bvnImageFallback = function(img) {
  if (!img || img.getAttribute('data-fallback-applied')) return;
  img.setAttribute('data-fallback-applied', 'true');
  img.src = FALLBACK_SCHOOL_SVG;
  img.classList.add('is-fallback-placeholder');
  const parentContainer = img.closest('.hero-bg-container, .about-image-card, .bento-img-wrapper, .principal-portrait-frame, .topper-img-wrapper');
  if (parentContainer) {
    parentContainer.classList.add('is-loaded');
  }
};

// Global error capture for failed image loads (triggers even before DOMContentLoaded)
window.addEventListener('error', (e) => {
  if (e.target && e.target.tagName === 'IMG') {
    window.bvnImageFallback(e.target);
  }
}, true);

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* --------------------------------------------------------------------------
     0. Milestone 1: Fullscreen Official Logo Splash & Dynamic Navbar Docking Transition
     -------------------------------------------------------------------------- */
  const initSplashDocking = () => {
    const splashOverlay = document.getElementById('bvnSplashIntro');
    const splashHeroLogo = document.getElementById('splashHeroLogo');
    const splashGlow = document.querySelector('.splash-golden-glow');
    const targetNavLogo = document.getElementById('navbarSchoolLogo') || document.querySelector('.brand-identity .school-logo-img');

    if (!splashOverlay) return;

    // Ensure initial overlay visibility & prevent background scroll
    splashOverlay.style.display = 'flex';
    splashOverlay.classList.remove('splash-fade-out');
    document.body.style.overflow = 'hidden';

    // Allow user to tap/click splash screen to instantly enter website
    splashOverlay.addEventListener('click', () => {
      finishSplash();
    });

    // Hide target navbar logo during splash presentation for smooth handoff
    if (targetNavLogo) {
      targetNavLogo.style.opacity = '0';
      targetNavLogo.style.transition = 'opacity 0.3s ease';
    }

    const finishSplash = () => {
      if (targetNavLogo) {
        targetNavLogo.style.opacity = '1';
      }
      if (splashOverlay) {
        splashOverlay.style.display = 'none';
      }
      document.body.style.overflow = '';
    };

    // After 1.0s fullscreen showcase, execute hardware-accelerated docking into navbar brand
    setTimeout(() => {
      if (!splashHeroLogo || !targetNavLogo) {
        finishSplash();
        return;
      }

      // Smoothly fade out the golden glow
      if (splashGlow) {
        splashGlow.style.opacity = '0';
        splashGlow.style.transition = 'opacity 0.4s ease';
      }

      // Calculate exact coordinates for seamless docking into top-left navbar logo
      const startRect = splashHeroLogo.getBoundingClientRect();
      const targetRect = targetNavLogo.getBoundingClientRect();

      const startCenterX = startRect.left + startRect.width / 2;
      const startCenterY = startRect.top + startRect.height / 2;
      const targetCenterX = targetRect.left + targetRect.width / 2;
      const targetCenterY = targetRect.top + targetRect.height / 2;

      const deltaX = targetCenterX - startCenterX;
      const deltaY = targetCenterY - startCenterY;
      const targetHeight = targetRect.height > 0 ? targetRect.height : 54;
      const startHeight = startRect.height > 0 ? startRect.height : 320;
      const scale = targetHeight / startHeight;

      // Perform smooth 60fps hardware-accelerated docking transition
      splashHeroLogo.style.animation = 'none';
      splashHeroLogo.style.transition = 'transform 0.85s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.85s ease';
      splashHeroLogo.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scale})`;

      // Fade out background overlay to reveal the website
      setTimeout(() => {
        splashOverlay.classList.add('splash-fade-out');
      }, 200);

      // Complete docking handoff to navbar logo
      setTimeout(() => {
        finishSplash();
      }, 850);
    }, 1000);

    // Failsafe timeout in case of unexpected delays
    setTimeout(() => {
      if (splashOverlay && splashOverlay.style.display !== 'none') {
        finishSplash();
      }
    }, 3000);
  };

  // Run Splash Docking Initialization
  initSplashDocking();

  // Feature 4: Skeleton Shimmer Watcher (Pure CSS Shimmer Graceful Fade-Out)
  const imageContainers = document.querySelectorAll(
    '.hero-bg-container, .about-image-card, .bento-img-wrapper, .principal-portrait-frame, .topper-img-wrapper'
  );

  imageContainers.forEach((container) => {
    const img = container.querySelector('img');
    if (!img) {
      container.classList.add('is-loaded');
      return;
    }

    const markLoaded = () => {
      container.classList.add('is-loaded');
      img.classList.add('image-loaded');
    };

    if (img.complete && img.naturalWidth > 0) {
      markLoaded();
    } else {
      img.addEventListener('load', markLoaded, { once: true });
      img.addEventListener('error', () => {
        window.bvnImageFallback(img);
        markLoaded();
      }, { once: true });
    }
  });

  // Attach error handler to any image that already completed with zero natural width
  document.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', function() {
      window.bvnImageFallback(this);
    });
    if (img.complete && img.naturalWidth === 0) {
      window.bvnImageFallback(img);
    }
  });

  /* --------------------------------------------------------------------------
     1. Scroll Progress Bar, Sticky Header & Scroll Spy (Passive & Throttled)
     -------------------------------------------------------------------------- */
  const scrollProgress = document.getElementById('scrollProgress');
  const siteHeader = document.getElementById('siteHeader');
  const backToTopBtn = document.getElementById('backToTopBtn');
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.desktop-nav .nav-item');

  const handleScroll = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    // Update progress bar
    if (scrollHeight > 0 && scrollProgress) {
      const progressPercent = (scrollTop / scrollHeight) * 100;
      scrollProgress.style.width = `${progressPercent}%`;
    }

    // Header sticky shadow
    if (siteHeader) {
      if (scrollTop > 40) {
        siteHeader.classList.add('is-scrolled');
      } else {
        siteHeader.classList.remove('is-scrolled');
      }
    }

    // Back to top button visibility
    if (backToTopBtn) {
      if (scrollTop > 400) {
        backToTopBtn.classList.add('is-active');
      } else {
        backToTopBtn.classList.remove('is-active');
      }
    }

    // Active Navigation Item Spy
    let currentSectionId = '';
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (scrollTop >= sectionTop && scrollTop < sectionTop + sectionHeight) {
        currentSectionId = section.getAttribute('id');
      }
    });

    if (currentSectionId) {
      navLinks.forEach((link) => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSectionId}`) {
          link.classList.add('active');
        }
      });
    }
  };

  // Feature 5: High-Performance requestAnimationFrame Scroll Throttle
  let scrollTicking = false;
  const onScrollThrottled = () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  };

  window.addEventListener('scroll', onScrollThrottled, { passive: true });
  handleScroll(); // Initial check

  // Back to top action
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  /* --------------------------------------------------------------------------
     2. Announcement Bar Dismissal
     -------------------------------------------------------------------------- */
  const announcementBar = document.getElementById('announcementBar');
  const closeAnnouncementBtn = document.getElementById('closeAnnouncement');

  if (closeAnnouncementBtn && announcementBar) {
    if (sessionStorage.getItem('bvn_announcement_dismissed') === 'true') {
      announcementBar.classList.add('is-hidden');
    }

    closeAnnouncementBtn.addEventListener('click', () => {
      announcementBar.style.opacity = '0';
      announcementBar.style.maxHeight = '0';
      setTimeout(() => {
        announcementBar.classList.add('is-hidden');
        sessionStorage.setItem('bvn_announcement_dismissed', 'true');
      }, 300);
    });
  }

  /* --------------------------------------------------------------------------
     3. Mobile Navigation Drawer (Enhanced Auto-Close & Smooth Scroll)
     -------------------------------------------------------------------------- */
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileDrawerClose = document.getElementById('mobileDrawerClose');
  const drawerBackdrop = document.getElementById('drawerBackdrop');

  const openDrawer = () => {
    if (!mobileDrawer) return;
    mobileDrawer.classList.add('is-open');
    if (drawerBackdrop) drawerBackdrop.classList.add('is-open');
    if (mobileMenuToggle) {
      mobileMenuToggle.setAttribute('aria-expanded', 'true');
      mobileMenuToggle.classList.add('is-active');
    }
    document.body.style.overflow = 'hidden';
    document.body.classList.add('drawer-open', 'no-scroll');
  };

  const closeDrawer = () => {
    if (!mobileDrawer) return;
    mobileDrawer.classList.remove('is-open');
    if (drawerBackdrop) drawerBackdrop.classList.remove('is-open');
    if (mobileMenuToggle) {
      mobileMenuToggle.setAttribute('aria-expanded', 'false');
      mobileMenuToggle.classList.remove('is-active');
    }
    document.body.style.overflow = '';
    document.body.classList.remove('drawer-open', 'no-scroll');
  };

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mobileDrawer && mobileDrawer.classList.contains('is-open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  const mobileBottomMenuBtn = document.getElementById('mobileBottomMenuBtn');
  if (mobileBottomMenuBtn) {
    mobileBottomMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (mobileDrawer && mobileDrawer.classList.contains('is-open')) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });
  }

  if (mobileDrawerClose) {
    mobileDrawerClose.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDrawer();
    });
  }

  // Prevent clicks inside drawer from bubbling to document outside-click listener
  if (mobileDrawer) {
    mobileDrawer.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDrawer();
    });
  }

  // Closes mobile drawer when clicking outside the drawer box
  const handleOutsideDrawer = (e) => {
    if (!mobileDrawer || !mobileDrawer.classList.contains('is-open')) return;
    
    // Ignore clicks originating from inside the drawer itself
    if (mobileDrawer.contains(e.target)) return;
    
    // Ignore clicks on the toggle buttons (they handle their own toggle)
    if (mobileMenuToggle && (mobileMenuToggle === e.target || mobileMenuToggle.contains(e.target))) return;
    if (mobileBottomMenuBtn && (mobileBottomMenuBtn === e.target || mobileBottomMenuBtn.contains(e.target))) return;

    closeDrawer();
  };

  document.addEventListener('click', handleOutsideDrawer);

  // Escape key closes mobile drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileDrawer && mobileDrawer.classList.contains('is-open')) {
      closeDrawer();
    }
  });

  // High-Performance Passive Touch Gesture (Swipe-to-Close Drawer to the right)
  if (mobileDrawer) {
    let touchStartX = 0;
    let touchStartY = 0;
    mobileDrawer.addEventListener('touchstart', (e) => {
      if (e.changedTouches && e.changedTouches[0]) {
        touchStartX = e.changedTouches[0].clientX;
        touchStartY = e.changedTouches[0].clientY;
      }
    }, { passive: true });

    mobileDrawer.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches[0]) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const diffX = touchEndX - touchStartX;
        const diffY = Math.abs(touchEndY - touchStartY);
        // Only trigger close on deliberate horizontal rightward swipe (> 85px) with low vertical movement (< 30px)
        if (diffX > 85 && diffY < 30) {
          closeDrawer();
        }
      }
    }, { passive: true });
  }

  // Auto-close mobile drawer on nav item click and perform reliable smooth scroll
  const mobileNavItems = document.querySelectorAll(
    '#mobileDrawer .mobile-nav-item, #mobileDrawer a[href^="#"]'
  );

  mobileNavItems.forEach((item) => {
    item.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (!href || !href.startsWith('#') || href === '#') return;

      const targetElement = document.querySelector(href);
      if (targetElement) {
        e.preventDefault();
        e.stopPropagation();

        // 1. Immediately close the drawer and restore body overflow
        closeDrawer();

        // 2. Allow brief delay (120ms) for drawer slide-out & body reflow, then perform smooth scroll
        setTimeout(() => {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);

        // 3. Fallback check for mobile fixed header clearance
        setTimeout(() => {
          const siteHeaderEl = document.getElementById('siteHeader');
          const headerHeight = siteHeaderEl ? siteHeaderEl.offsetHeight : 70;
          const rect = targetElement.getBoundingClientRect();
          if (rect.top < 0 || rect.top > headerHeight + 35) {
            window.scrollBy({
              top: rect.top - (headerHeight + 12),
              behavior: 'smooth'
            });
          }
        }, 380);

        // 4. Update active state in nav
        document.querySelectorAll('.desktop-nav .nav-item, .mobile-nav-item').forEach((navLink) => {
          if (navLink.getAttribute('href') === href) {
            navLink.classList.add('active');
          } else {
            navLink.classList.remove('active');
          }
        });
      }
    });
  });

  /* --------------------------------------------------------------------------
     4. Animated Count-Up Counters (Colorado Academy Style)
     -------------------------------------------------------------------------- */
  const statCards = document.querySelectorAll('.stat-card');
  let countersAnimated = false;

  const animateCounter = (el, targetValue, duration = 2000) => {
    const startTime = performance.now();
    const startVal = 0;

    const step = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(startVal + (targetValue - startVal) * easeProgress);

      el.textContent = currentVal;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = targetValue;
      }
    };

    requestAnimationFrame(step);
  };

  const triggerCounters = () => {
    if (countersAnimated) return;
    countersAnimated = true;

    statCards.forEach((card) => {
      const counterSpan = card.querySelector('.stat-counter');
      const target = parseInt(card.getAttribute('data-counter'), 10);
      if (counterSpan && !isNaN(target)) {
        animateCounter(counterSpan, target, 2200);
      }
    });
  };

  const statsSection = document.getElementById('stats');
  if (statsSection) {
    const statsObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          triggerCounters();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    statsObserver.observe(statsSection);
  }

  /* --------------------------------------------------------------------------
     5. Scroll Reveal Animations (Shady Side Micro-Interactions)
     -------------------------------------------------------------------------- */
  const revealElements = document.querySelectorAll('.reveal-fade');
  if (revealElements.length > 0) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.15
    });

    revealElements.forEach((el) => revealObserver.observe(el));
  }

  const animatedCards = document.querySelectorAll('.bento-card, .facility-card, .stream-card, .topper-card, .testimonial-card');
  const cardObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 70);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  animatedCards.forEach((card) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(24px)';
    card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    cardObserver.observe(card);
  });

  /* --------------------------------------------------------------------------
     5.5. Milestone 3: Interactive Notice Board & Circulars Modal (#noticeBoardModal)
     -------------------------------------------------------------------------- */
  const openNoticeModalBtn = document.getElementById('openNoticeModalBtn');
  const noticeBoardModal = document.getElementById('noticeBoardModal');
  const closeNoticeModalBtn = document.getElementById('closeNoticeModalBtn');
  const noticeModalCloseFooterBtn = document.getElementById('noticeModalCloseFooterBtn');

  const openNoticeModal = () => {
    if (!noticeBoardModal) return;
    noticeBoardModal.classList.add('is-open');
    noticeBoardModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    loadSchoolNotices();
  };

  const closeNoticeModal = () => {
    if (!noticeBoardModal) return;
    noticeBoardModal.classList.remove('is-open');
    noticeBoardModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (openNoticeModalBtn) {
    openNoticeModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openNoticeModal();
    });
    // Keyboard accessibility: Enter or Space key
    openNoticeModalBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openNoticeModal();
      }
    });
  }

  const mobileBottomNoticeBtn = document.getElementById('mobileBottomNoticeBtn');
  if (mobileBottomNoticeBtn) {
    mobileBottomNoticeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openNoticeModal();
    });
  }

  if (closeNoticeModalBtn) {
    closeNoticeModalBtn.addEventListener('click', closeNoticeModal);
  }

  if (noticeModalCloseFooterBtn) {
    noticeModalCloseFooterBtn.addEventListener('click', closeNoticeModal);
  }

  if (noticeBoardModal) {
    noticeBoardModal.addEventListener('click', (e) => {
      if (e.target === noticeBoardModal) {
        closeNoticeModal();
      }
    });
  }

  // Global Escape Key to close open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (noticeBoardModal && noticeBoardModal.classList.contains('is-open')) {
        closeNoticeModal();
      }
    }
  });

  /* --------------------------------------------------------------------------
     6. Milestone 4: Performance-Optimized Zero-Lag Virtual Campus Tour Modal
     -------------------------------------------------------------------------- */
  const openTourModalBtn = document.getElementById('openTourModalBtn');
  const tourModalBackdrop = document.getElementById('tourModalBackdrop');
  const closeTourModalBtn = document.getElementById('closeTourModalBtn');
  const modalAdmissionBtn = document.getElementById('modalAdmissionBtn');
  const tourVideoIframe = document.getElementById('tourVideoIframe');
  const videoLoadingPlaceholder = document.getElementById('videoLoadingPlaceholder');

  const openTourModal = () => {
    if (!tourModalBackdrop || !tourVideoIframe) return;
    tourModalBackdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // Milestone 4: Inject src only when modal opens
    const videoDataSrc = tourVideoIframe.getAttribute('data-src') || 'https://www.youtube-nocookie.com/embed/5qap5aO4i9A?autoplay=1&enablejsapi=1';
    
    if (videoLoadingPlaceholder) {
      videoLoadingPlaceholder.style.display = 'flex';
    }

    tourVideoIframe.src = videoDataSrc;

    tourVideoIframe.onload = () => {
      if (videoLoadingPlaceholder) {
        videoLoadingPlaceholder.style.display = 'none';
      }
    };
  };

  const closeTourModal = () => {
    if (!tourModalBackdrop || !tourVideoIframe) return;
    tourModalBackdrop.classList.remove('is-open');
    document.body.style.overflow = '';

    // Milestone 4: Completely unload iframe to cease background scripts and audio
    tourVideoIframe.src = '';
  };

  if (openTourModalBtn) {
    openTourModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openTourModal();
    });
  }

  if (closeTourModalBtn) {
    closeTourModalBtn.addEventListener('click', closeTourModal);
  }

  if (tourModalBackdrop) {
    tourModalBackdrop.addEventListener('click', (e) => {
      if (e.target === tourModalBackdrop) {
        closeTourModal();
      }
    });
  }

  if (modalAdmissionBtn) {
    modalAdmissionBtn.addEventListener('click', () => {
      closeTourModal();
    });
  }

  /* --------------------------------------------------------------------------
     7. Milestone 3: Interactive School ERP / Student & Staff Portal Login Modal
     -------------------------------------------------------------------------- */
  const openErpModalBtn = document.getElementById('openErpModalBtn');
  const openErpModalTopBtn = document.getElementById('openErpModalTopBtn');
  const openErpModalMobileBtn = document.getElementById('openErpModalMobileBtn');
  const erpModalBackdrop = document.getElementById('erpModalBackdrop');
  const closeErpModalBtn = document.getElementById('closeErpModalBtn');

  // Tabs
  const tabStudentBtn = document.getElementById('tabStudentBtn');
  const tabStaffBtn = document.getElementById('tabStaffBtn');
  const studentLoginPanel = document.getElementById('studentLoginPanel');
  const staffLoginPanel = document.getElementById('staffLoginPanel');

  // Forms
  const studentLoginForm = document.getElementById('studentLoginForm');
  const staffLoginForm = document.getElementById('staffLoginForm');
  const erpAlertBox = document.getElementById('erpAlertBox');

  const openErpModal = () => {
    if (!erpModalBackdrop) return;
    erpModalBackdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (erpAlertBox) {
      erpAlertBox.className = 'erp-alert-box';
      erpAlertBox.textContent = '';
    }
  };

  const closeErpModal = () => {
    if (!erpModalBackdrop) return;
    erpModalBackdrop.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  if (openErpModalBtn) openErpModalBtn.addEventListener('click', openErpModal);
  if (openErpModalTopBtn) openErpModalTopBtn.addEventListener('click', openErpModal);
  if (openErpModalMobileBtn) {
    openErpModalMobileBtn.addEventListener('click', () => {
      closeDrawer();
      openErpModal();
    });
  }
  if (closeErpModalBtn) closeErpModalBtn.addEventListener('click', closeErpModal);

  if (erpModalBackdrop) {
    erpModalBackdrop.addEventListener('click', (e) => {
      if (e.target === erpModalBackdrop) {
        closeErpModal();
      }
    });
  }

  // Switch tabs
  const switchErpTab = (isStudentTab) => {
    if (isStudentTab) {
      tabStudentBtn.classList.add('active');
      tabStudentBtn.setAttribute('aria-selected', 'true');
      tabStaffBtn.classList.remove('active');
      tabStaffBtn.setAttribute('aria-selected', 'false');

      studentLoginPanel.classList.add('active');
      staffLoginPanel.classList.remove('active');
    } else {
      tabStaffBtn.classList.add('active');
      tabStaffBtn.setAttribute('aria-selected', 'true');
      tabStudentBtn.classList.remove('active');
      tabStudentBtn.setAttribute('aria-selected', 'false');

      staffLoginPanel.classList.add('active');
      studentLoginPanel.classList.remove('active');
    }

    if (erpAlertBox) {
      erpAlertBox.className = 'erp-alert-box';
      erpAlertBox.textContent = '';
    }
  };

  if (tabStudentBtn && tabStaffBtn) {
    tabStudentBtn.addEventListener('click', () => switchErpTab(true));
    tabStaffBtn.addEventListener('click', () => switchErpTab(false));
  }

  // Show/Hide password toggle buttons in ERP modal
  document.querySelectorAll('.toggle-password-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
      const input = this.parentElement.querySelector('input');
      const icon = this.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });

  // Student Login simulation
  if (studentLoginForm) {
    studentLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const admInput = document.getElementById('studentAdmissionNo');
      const dobInput = document.getElementById('studentDob');
      const submitBtn = document.getElementById('studentLoginSubmitBtn');

      let valid = true;
      if (!admInput.value.trim() || admInput.value.trim().length < 3) {
        admInput.closest('.form-group').classList.add('has-error');
        valid = false;
      } else {
        admInput.closest('.form-group').classList.remove('has-error');
      }

      if (!dobInput.value.trim() || dobInput.value.trim().length < 4) {
        dobInput.closest('.form-group').classList.add('has-error');
        valid = false;
      } else {
        dobInput.closest('.form-group').classList.remove('has-error');
      }

      if (!valid) return;

      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;

        erpAlertBox.className = 'erp-alert-box erp-alert-success is-visible';
        erpAlertBox.innerHTML = '<i class="fa-solid fa-circle-check"></i> लॉगिन सफल! छात्र पोर्टल (ERP Dashboard) लोड हो रहा है...';
        
        setTimeout(() => {
          closeErpModal();
          studentLoginForm.reset();
        }, 1800);
      }, 1100);
    });
  }

  // Staff Login simulation
  if (staffLoginForm) {
    staffLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const empInput = document.getElementById('staffEmployeeId');
      const passInput = document.getElementById('staffPassword');
      const submitBtn = document.getElementById('staffLoginSubmitBtn');

      let valid = true;
      if (!empInput.value.trim() || empInput.value.trim().length < 3) {
        empInput.closest('.form-group').classList.add('has-error');
        valid = false;
      } else {
        empInput.closest('.form-group').classList.remove('has-error');
      }

      if (!passInput.value.trim() || passInput.value.trim().length < 4) {
        passInput.closest('.form-group').classList.add('has-error');
        valid = false;
      } else {
        passInput.closest('.form-group').classList.remove('has-error');
      }

      if (!valid) return;

      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;

        erpAlertBox.className = 'erp-alert-box erp-alert-success is-visible';
        erpAlertBox.innerHTML = '<i class="fa-solid fa-circle-check"></i> फैकल्टी सत्यापन सफल! शिक्षक प्रबंधन डैशबोर्ड लोड हो रहा है...';

        setTimeout(() => {
          closeErpModal();
          staffLoginForm.reset();
        }, 1800);
      }, 1100);
    });
  }

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (tourModalBackdrop && tourModalBackdrop.classList.contains('is-open')) {
        closeTourModal();
      }
      if (erpModalBackdrop && erpModalBackdrop.classList.contains('is-open')) {
        closeErpModal();
      }
      if (mobileDrawer && mobileDrawer.classList.contains('is-open')) {
        closeDrawer();
      }
    }
  });

  /* --------------------------------------------------------------------------
     8. Module 2 & 3: Interactive Admission & Contact Enquiry Form (Supabase Engine)
     -------------------------------------------------------------------------- */
  const admissionForm = document.getElementById('admissionForm');
  const formSuccessState = document.getElementById('formSuccessState');
  const resetFormBtn = document.getElementById('resetFormBtn');
  const submitFormBtn = document.getElementById('submitFormBtn');
  const formSpinner = document.getElementById('formSpinner');
  const formBtnText = document.getElementById('formBtnText');
  const formErrorBanner = document.getElementById('formErrorBanner');
  const formErrorBannerText = document.getElementById('formErrorBannerText');
  const btnCloseErrorBanner = document.getElementById('btnCloseErrorBanner');
  const summaryStudentName = document.getElementById('summaryStudentName');
  const summaryPhone = document.getElementById('summaryPhone');
  const summaryTargetClass = document.getElementById('summaryTargetClass');

  if (btnCloseErrorBanner && formErrorBanner) {
    btnCloseErrorBanner.addEventListener('click', () => {
      formErrorBanner.style.display = 'none';
    });
  }

  // Form Fields
  const fullNameInput = document.getElementById('fullName') || document.getElementById('parentName');
  const contactMobileInput = document.getElementById('contactMobile');
  const targetClassSelect = document.getElementById('targetClass');
  const parentQueryInput = document.getElementById('parentQuery');

  // Strict 10-digit Indian Mobile Pattern (^[6-9]\d{9}$)
  const isValidIndianMobile = (phone) => {
    const cleaned = (phone || '').replace(/[\s\-()]/g, '');
    const regex = /^[6-9]\d{9}$/;
    return regex.test(cleaned);
  };

  // Indian Mobile Masking Formatter (98765 43210)
  const formatMobileNumber = (digits) => {
    if (!digits) return '';
    const cleanDigits = digits.replace(/\D/g, '').slice(0, 10);
    if (cleanDigits.length > 5) {
      return `${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5, 10)}`;
    }
    return cleanDigits;
  };

  // Enhanced Field Error / Valid State Handler
  const setFieldError = (inputEl, errorId, hasError) => {
    if (!inputEl) return;
    const formGroup = inputEl.closest('.form-group');
    if (!formGroup) return;

    if (hasError) {
      formGroup.classList.add('has-error');
      formGroup.classList.remove('is-valid');
    } else {
      formGroup.classList.remove('has-error');
      formGroup.classList.add('is-valid');
    }
  };

  // Real-time mobile input formatting and validation feedback
  if (contactMobileInput) {
    contactMobileInput.addEventListener('input', (e) => {
      const rawDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
      e.target.value = formatMobileNumber(rawDigits);

      if (rawDigits.length === 10) {
        if (isValidIndianMobile(rawDigits)) {
          setFieldError(contactMobileInput, 'contactMobileError', false);
        } else {
          setFieldError(contactMobileInput, 'contactMobileError', true);
        }
      } else if (rawDigits.length > 0 && !/^[6-9]/.test(rawDigits)) {
        setFieldError(contactMobileInput, 'contactMobileError', true);
      } else {
        const formGroup = contactMobileInput.closest('.form-group');
        if (formGroup) {
          formGroup.classList.remove('has-error', 'is-valid');
        }
      }
    });
  }

  if (fullNameInput) {
    fullNameInput.addEventListener('input', () => {
      if (fullNameInput.value.trim().length >= 3) {
        setFieldError(fullNameInput, 'fullNameError', false);
      }
    });
  }

  if (targetClassSelect) {
    targetClassSelect.addEventListener('change', () => {
      if (targetClassSelect.value) {
        setFieldError(targetClassSelect, 'targetClassError', false);
      } else {
        setFieldError(targetClassSelect, 'targetClassError', true);
      }
    });
  }

  // Handle Form Submission with Supabase & Resilient Local Storage
  if (admissionForm) {
    admissionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      let hasErrors = false;
      const errorList = [];

      // 1. Validate Full Name (name) - required (min 2 chars)
      const name = fullNameInput ? fullNameInput.value.trim() : '';
      if (!name || name.length < 2) {
        setFieldError(fullNameInput, 'fullNameError', true);
        hasErrors = true;
        errorList.push('पूरा नाम (Full Name)');
      } else {
        setFieldError(fullNameInput, 'fullNameError', false);
      }

      // 2. Validate Mobile Number (phone) - required (10 digits Indian)
      let rawDigits = (contactMobileInput ? contactMobileInput.value : '').replace(/\D/g, '');
      if (rawDigits.length === 12 && rawDigits.startsWith('91')) {
        rawDigits = rawDigits.slice(2);
      } else if (rawDigits.length === 11 && rawDigits.startsWith('0')) {
        rawDigits = rawDigits.slice(1);
      }

      if (!isValidIndianMobile(rawDigits)) {
        setFieldError(contactMobileInput, 'contactMobileError', true);
        hasErrors = true;
        errorList.push('10 अंकों का मान्य मोबाइल नंबर (Mobile Number)');
      } else {
        setFieldError(contactMobileInput, 'contactMobileError', false);
      }
      const phone = rawDigits;

      // 3. Validate Class / Grade of Interest (class_grade) - required
      const class_grade = targetClassSelect ? targetClassSelect.value : '';
      if (!class_grade) {
        setFieldError(targetClassSelect, 'targetClassError', true);
        hasErrors = true;
        errorList.push('प्रवेश हेतु कक्षा (Select Class)');
      } else {
        setFieldError(targetClassSelect, 'targetClassError', false);
      }

      // 4. Message / Query (message) - optional
      const message = parentQueryInput ? parentQueryInput.value.trim() : '';

      if (hasErrors) {
        if (formErrorBanner) {
          if (formErrorBannerText) {
            formErrorBannerText.textContent = `कृपया निम्नलिखित विवरण सही भरें: ${errorList.join(', ')}`;
          }
          formErrorBanner.style.display = 'block';
          formErrorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const firstError = admissionForm.querySelector('.has-error input, .has-error select');
        if (firstError) {
          firstError.focus();
        }
        return;
      }

      // Hide any previous error banner
      if (formErrorBanner) {
        formErrorBanner.style.display = 'none';
      }

      // Step 02: UI Loading State ("भेजा जा रहा है...")
      if (submitFormBtn) {
        submitFormBtn.classList.add('is-loading');
        submitFormBtn.disabled = true;
      }
      if (formSpinner) {
        formSpinner.style.display = 'inline-block';
      }
      if (formBtnText) {
        formBtnText.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> भेजा जा रहा है...';
      }

      // Step 03: Prepare Enquiry Record
      const newEnquiry = {
        id: Date.now(),
        name: name,
        phone: phone,
        class_grade: class_grade,
        message: message || '',
        created_at: new Date().toISOString()
      };

      // Always save enquiry to localStorage so it is never lost and visible in admin portal
      try {
        const localEnquiries = JSON.parse(localStorage.getItem('bvn_enquiries_local') || '[]');
        localEnquiries.unshift(newEnquiry);
        localStorage.setItem('bvn_enquiries_local', JSON.stringify(localEnquiries));
      } catch (locErr) {
        console.warn('Local storage write warning:', locErr);
      }

      // Attempt Supabase insert concurrently
      try {
        if (!supabase && window.supabase && typeof window.supabase.createClient === 'function') {
          supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        }
        if (supabase) {
          supabase
            .from('enquiries')
            .insert([{ name, phone, class_grade, message }])
            .then(({ error }) => {
              if (error) {
                console.warn('Supabase cloud sync warning:', error);
              } else {
                console.info('Supabase enquiry successfully synchronized to cloud!');
              }
            })
            .catch((sbErr) => {
              console.warn('Supabase network unreachable, enquiry recorded locally:', sbErr);
            });
        }
      } catch (e) {
        console.warn('Supabase client check note:', e);
      }

      // Synchronize admission enquiry to n8n Automation Engine (Google Sheets + Telegram)
      const n8nWebhookUrl = 'https://bhaveshdewangan.app.n8n.cloud/webhook/0690f739-84cc-4a9d-81fc-8ce4ba7be1e9/chat';
      try {
        fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendMessage',
            sessionId: 'form_' + Date.now(),
            chatInput: `📝 [नया प्रवेश फॉर्म आवेदन] छात्र: ${name} | मोबाइल: ${phone} | कक्षा: ${class_grade} | संदेश: ${message || 'कोई अतिरिक्त संदेश नहीं'}`
          })
        }).catch((n8nErr) => {
          console.warn('n8n sync notification note:', n8nErr);
        });
      } catch (e) {
        console.warn('n8n dispatch error:', e);
      }

      // Brief simulated delay for clean UX feedback
      setTimeout(() => {
        // Reset the form
        admissionForm.reset();
        admissionForm.querySelectorAll('.form-group').forEach((group) => {
          group.classList.remove('has-error', 'is-valid');
        });

        // Hide form and reveal success confirmation card
        admissionForm.style.display = 'none';

        if (summaryStudentName) {
          summaryStudentName.textContent = name;
        }
        if (summaryPhone) {
          summaryPhone.textContent = `+91 ${formatMobileNumber(phone)}`;
        }
        if (summaryTargetClass) {
          summaryTargetClass.textContent = class_grade;
        }

        if (formSuccessState) {
          formSuccessState.style.display = 'block';
          formSuccessState.classList.add('is-visible');
          setTimeout(() => {
            formSuccessState.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 50);
        }

        // Restore button state
        if (submitFormBtn) {
          submitFormBtn.classList.remove('is-loading');
          submitFormBtn.disabled = false;
        }
        if (formSpinner) {
          formSpinner.style.display = 'none';
        }
        if (formBtnText) {
          formBtnText.innerHTML = '<i class="fa-solid fa-paper-plane"></i> पूछताछ भेजें (Submit Enquiry)';
        }
      }, 500);
    });
  }

  // Reset Form
  if (resetFormBtn && admissionForm && formSuccessState) {
    resetFormBtn.addEventListener('click', () => {
      admissionForm.reset();
      admissionForm.querySelectorAll('.form-group').forEach((group) => {
        group.classList.remove('has-error', 'is-valid');
      });
      if (submitFormBtn) {
        submitFormBtn.classList.remove('is-loading');
        submitFormBtn.disabled = false;
      }
      if (formSpinner) {
        formSpinner.style.display = 'none';
      }
      if (formBtnText) {
        formBtnText.innerHTML = '<i class="fa-solid fa-paper-plane"></i> पूछताछ भेजें (Submit Enquiry)';
      }
      if (formErrorBanner) {
        formErrorBanner.style.display = 'none';
      }
      formSuccessState.classList.remove('is-visible');
      formSuccessState.style.display = 'none';
      admissionForm.style.display = 'block';
      if (fullNameInput) {
        fullNameInput.focus();
      }
    });
  }


  /* --------------------------------------------------------------------------
     9. Smooth Anchor Link Scrolling (Desktop & Page Body)
     -------------------------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]:not(#mobileDrawer a)').forEach((anchor) => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || !targetId) return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const siteHeaderEl = document.getElementById('siteHeader');
        const headerHeight = siteHeaderEl ? siteHeaderEl.offsetHeight : 80;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - (headerHeight + 12);

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });
      }
    });
  });

  /* --------------------------------------------------------------------------
     10. Feature 1: Interactive Campus Photo Gallery & Lightbox Controller
     -------------------------------------------------------------------------- */
  const galleryFilterBtns = document.querySelectorAll('.gallery-filter-btn');
  const galleryLightbox = document.getElementById('galleryLightbox');
  const closeGalleryLightbox = document.getElementById('closeGalleryLightbox');
  const lightboxVisualContainer = document.getElementById('lightboxVisualContainer');
  const lightboxBadge = document.getElementById('lightboxBadge');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxDesc = document.getElementById('lightboxDesc');

  // Filter functionality: Supports both static fallback cards and dynamically fetched Supabase items
  const applyActiveGalleryFilter = () => {
    const activeBtn = document.querySelector('.gallery-filter-btn.active');
    const selectedFilter = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
    const items = document.querySelectorAll('.gallery-item');

    items.forEach((item) => {
      const itemCategory = item.getAttribute('data-category');
      if (typeof matchGalleryCategory === 'function' && matchGalleryCategory(itemCategory, selectedFilter)) {
        item.classList.remove('is-hidden');
        item.style.opacity = '1';
        item.style.transform = 'scale(1)';
      } else if (selectedFilter === 'all' || itemCategory === selectedFilter) {
        item.classList.remove('is-hidden');
        item.style.opacity = '1';
        item.style.transform = 'scale(1)';
      } else {
        item.classList.add('is-hidden');
      }
    });
  };
  window.applyActiveGalleryFilter = applyActiveGalleryFilter;

  if (galleryFilterBtns.length > 0) {
    galleryFilterBtns.forEach((btn) => {
      btn.addEventListener('click', function() {
        galleryFilterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        applyActiveGalleryFilter();
      });
    });
  }

  // Lightbox functionality: Displays full image preview if data-img-url exists, else fallback crest
  const openLightbox = (title, desc, cat, visualClass, imgUrl) => {
    if (!galleryLightbox) return;
    if (lightboxTitle) lightboxTitle.textContent = title || 'कैंपस दृश्य';
    if (lightboxDesc) lightboxDesc.textContent = desc || 'भावेश विद्या निकेतन';
    if (lightboxBadge) lightboxBadge.textContent = cat || 'परिसर';

    if (lightboxVisualContainer) {
      if (imgUrl) {
        lightboxVisualContainer.className = 'lightbox-visual';
        lightboxVisualContainer.style.background = '#030a14';
        lightboxVisualContainer.style.display = 'flex';
        lightboxVisualContainer.style.alignItems = 'center';
        lightboxVisualContainer.style.justifyContent = 'center';
        lightboxVisualContainer.innerHTML = `
          <img src="${imgUrl}" alt="${typeof escapeHTML === 'function' ? escapeHTML(title || '') : ''}" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);" onerror="this.src='assets/images/logo.png'">
        `;
      } else {
        lightboxVisualContainer.style.background = '';
        lightboxVisualContainer.style.display = '';
        lightboxVisualContainer.className = 'lightbox-visual ' + (visualClass || 'lab-bg');
        lightboxVisualContainer.innerHTML = '<div class="splash-golden-glow" style="position: absolute;"></div><img src="assets/images/logo.png" alt="BVN Crest" style="width: 130px; height: 130px; object-fit: contain; z-index: 2; filter: drop-shadow(0 6px 16px rgba(0,0,0,0.6));">';
      }
    }

    galleryLightbox.classList.add('is-open');
    galleryLightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    if (!galleryLightbox) return;
    galleryLightbox.classList.remove('is-open');
    galleryLightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  // Bind zoom buttons (works for both initial static cards and newly injected Supabase items)
  const bindGalleryZoomEvents = () => {
    document.querySelectorAll('.gallery-zoom-btn').forEach((btn) => {
      btn.onclick = function(e) {
        e.stopPropagation();
        const title = this.getAttribute('data-img-title');
        const desc = this.getAttribute('data-img-desc');
        const cat = this.getAttribute('data-img-cat');
        const imgUrl = this.getAttribute('data-img-url');
        const visualParent = this.closest('.gallery-card-visual');
        let visualClass = 'lab-bg';
        if (visualParent) {
          const classes = visualParent.className.split(' ');
          visualClass = classes.find(c => c.endsWith('-bg')) || 'lab-bg';
        }
        openLightbox(title, desc, cat, visualClass, imgUrl);
      };
    });
  };
  window.bindGalleryZoomEvents = bindGalleryZoomEvents;
  bindGalleryZoomEvents();

  if (closeGalleryLightbox) {
    closeGalleryLightbox.addEventListener('click', closeLightbox);
  }

  if (galleryLightbox) {
    galleryLightbox.addEventListener('click', (e) => {
      if (e.target === galleryLightbox) {
        closeLightbox();
      }
    });
  }

  /* --------------------------------------------------------------------------
     11. Feature 2: Official School Prospectus & Fee Structure Modal Controller
     -------------------------------------------------------------------------- */
  const prospectusModal = document.getElementById('prospectusModal');
  const closeProspectusModal = document.getElementById('closeProspectusModal');
  const openProspectusMobileBtn = document.getElementById('openProspectusMobileBtn');
  const openProspectusBodyBtn = document.getElementById('openProspectusBodyBtn');
  const openProspectusFooterBtn = document.getElementById('openProspectusFooterBtn');
  const printProspectusBtn = document.getElementById('printProspectusBtn');
  const prospectusApplyNowBtn = document.getElementById('prospectusApplyNowBtn');
  const prospectusTabs = document.querySelectorAll('.prospectus-tab');
  const prospectusTabContents = document.querySelectorAll('.prospectus-tab-content');

  const openProspectus = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!prospectusModal) return;
    prospectusModal.classList.add('is-open');
    prospectusModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeProspectus = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!prospectusModal) return;
    prospectusModal.classList.remove('is-open');
    prospectusModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (openProspectusMobileBtn) {
    openProspectusMobileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
      openProspectus();
    });
  }

  if (openProspectusBodyBtn) {
    openProspectusBodyBtn.addEventListener('click', openProspectus);
  }

  if (openProspectusFooterBtn) {
    openProspectusFooterBtn.addEventListener('click', openProspectus);
  }

  if (closeProspectusModal) {
    closeProspectusModal.addEventListener('click', closeProspectus);
  }

  if (prospectusModal) {
    prospectusModal.addEventListener('click', (e) => {
      if (e.target === prospectusModal) {
        closeProspectus();
      }
    });
  }

  // Prospectus Tab Switching
  if (prospectusTabs.length > 0) {
    prospectusTabs.forEach((tab) => {
      tab.addEventListener('click', function() {
        prospectusTabs.forEach(t => t.classList.remove('active'));
        prospectusTabContents.forEach(c => c.classList.remove('active'));

        this.classList.add('active');
        const targetTabId = this.getAttribute('data-tab');
        const targetContent = document.getElementById(targetTabId);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  // Print Prospectus
  if (printProspectusBtn) {
    printProspectusBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // Apply Now from Prospectus Modal
  if (prospectusApplyNowBtn) {
    prospectusApplyNowBtn.addEventListener('click', (e) => {
      closeProspectus();
      const parentNameField = document.getElementById('parentName');
      if (parentNameField) {
        setTimeout(() => parentNameField.focus(), 500);
      }
    });
  }

  // Global Escape key controller for new modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (galleryLightbox && galleryLightbox.classList.contains('is-open')) {
        closeLightbox();
      }
      if (prospectusModal && prospectusModal.classList.contains('is-open')) {
        closeProspectus();
      }
    }
  });

  /* --------------------------------------------------------------------------
     12. Feature 4: Progressive Web App (PWA) Service Worker & Install Controller
     -------------------------------------------------------------------------- */
  // Service Worker Registration
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('✅ BVN PWA Service Worker Registered Successfully! Scope:', reg.scope);
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.log('BVN PWA Service Worker Registration Note:', err);
        });
    });
  }

  // Native PWA Install Prompt Listener
  let deferredPrompt = null;
  const pwaInstallBtn = document.getElementById('pwaInstallBtn');

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar
    e.preventDefault();
    deferredPrompt = e;

    // Reveal install button in mobile drawer
    if (pwaInstallBtn) {
      pwaInstallBtn.style.display = 'block';
    }
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('User PWA Install Outcome:', outcome);
        deferredPrompt = null;
        pwaInstallBtn.style.display = 'none';
      } else {
        alert('BVN स्कूल पोर्टल इंस्टॉल करने के लिए अपने ब्राउज़र मेनू (तीन बिंदु / शेयर) में जाकर "Add to Home screen" या "Install App" चुनें।');
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    console.log('✅ भावेश विद्या निकेतन PWA ऐप सफलतापूर्वक इंस्टॉल हो गया!');
    if (pwaInstallBtn) {
      pwaInstallBtn.style.display = 'none';
    }
    deferredPrompt = null;
  });

  /* --------------------------------------------------------------------------
     14. 24/7 AI Voice Admissions Receptionist Engine ("नैना" Voice AI)
     -------------------------------------------------------------------------- */
  const initNainaVoiceAssistant = () => {
    const backdrop = document.getElementById('nainaVoiceModalBackdrop');
    const openNavBtn = document.getElementById('openNainaVoiceModalBtn');
    const openHeroBtn = document.getElementById('openNainaHeroBtn');
    const openMobBtn = document.getElementById('mobileBottomVoiceBtn');
    const closeBtn = document.getElementById('closeNainaVoiceModalBtn');
    const endCallBtn = document.getElementById('nainaEndCallBtn');
    const micBtn = document.getElementById('nainaMicBtn');
    const micIcon = document.getElementById('nainaMicIcon');
    const micLabel = document.getElementById('nainaMicLabel');
    const statusText = document.getElementById('nainaCallStatusText');
    const avatarStage = document.getElementById('nainaAvatarStage');
    const botMsg = document.getElementById('nainaLiveBotMsg');
    const userMsg = document.getElementById('nainaLiveUserMsg');
    const transcriptBox = document.getElementById('nainaTranscriptBox');
    const chipBtns = document.querySelectorAll('.naina-chip-btn');
    const textForm = document.getElementById('nainaTextForm');
    const textInput = document.getElementById('nainaTextInput');

    if (!backdrop) return;

    let voiceSessionId = 'voice_' + Date.now();
    let isListening = false;
    let isSpeaking = false;
    const n8nWebhook = 'https://bhaveshdewangan.app.n8n.cloud/webhook/0690f739-84cc-4a9d-81fc-8ce4ba7be1e9/chat';

    // Keep global reference to active utterance queue to prevent Mobile Garbage Collection
    window._nainaUtteranceQueue = [];

    // Pre-warm speech synthesis immediately on user interaction
    const warmUpMobileSpeech = () => {
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.resume();
          const dummy = new SpeechSynthesisUtterance(' ');
          dummy.volume = 0.01;
          dummy.rate = 2.0;
          window.speechSynthesis.speak(dummy);
        } catch (e) {}
      }
    };

    // Chrome Mobile Heartbeat: Prevents speech engine from pausing or dying after 10-15 seconds
    setInterval(() => {
      if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 3500);

    // Pre-cache browser voices
    let cachedVoices = [];
    const refreshVoices = () => {
      if ('speechSynthesis' in window) {
        cachedVoices = window.speechSynthesis.getVoices() || [];
      }
    };
    refreshVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }

    // Speech Recognition setup (Speech-to-Text)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition = null;
    if (SpeechRecognition) {
      try {
        recognition = new SpeechRecognition();
        recognition.lang = 'hi-IN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
      } catch (e) {
        console.warn('SpeechRecognition initialization note:', e);
      }
    }

    // Speech Synthesis setup (Chunked Sequential Audio for 100% Mobile Reliability)
    const speakHindi = (text, onEndCallback) => {
      if (!('speechSynthesis' in window)) {
        if (onEndCallback) onEndCallback();
        return;
      }

      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
      } catch (e) {}

      // Clean text for natural verbal reading
      const cleanText = text
        .replace(/^[=\s-]+/, '')
        .replace(/[*#•`_~]/g, '')
        .replace(/₹/g, 'रुपए ')
        .trim();

      if (!cleanText) {
        if (onEndCallback) onEndCallback();
        return;
      }

      // Split into bite-sized sentence chunks (prevents mobile 15-second audio dropouts)
      const rawChunks = cleanText.split(/([।\n.?!]+)/);
      const chunks = [];
      let temp = '';
      for (let i = 0; i < rawChunks.length; i++) {
        temp += rawChunks[i];
        if (temp.length > 70 || rawChunks[i].match(/[।\n.?!]/)) {
          if (temp.trim()) chunks.push(temp.trim());
          temp = '';
        }
      }
      if (temp.trim()) chunks.push(temp.trim());
      if (chunks.length === 0) chunks.push(cleanText);

      if (cachedVoices.length === 0) {
        refreshVoices();
      }

      // Find best Hindi voice or Indian English fallback
      const hindiVoice = cachedVoices.find(v => {
        const lang = (v.lang || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        return lang.includes('hi') || lang.includes('in') || name.includes('hindi') || name.includes('kalpana') || name.includes('lekha') || name.includes('heera') || name.includes('ravi');
      });

      // Clear previous queue
      window._nainaUtteranceQueue = [];
      let currentChunkIdx = 0;

      isSpeaking = true;
      if (avatarStage) avatarStage.classList.add('is-speaking');
      if (statusText) statusText.textContent = 'नैना बोल रही हैं...';

      const speakNextChunk = () => {
        if (currentChunkIdx >= chunks.length) {
          isSpeaking = false;
          window._nainaUtteranceQueue = [];
          if (avatarStage) avatarStage.classList.remove('is-speaking');
          if (statusText) statusText.textContent = 'कॉल सक्रिय • आपकी बारी, बोलें या लिखें';
          if (onEndCallback) onEndCallback();
          return;
        }

        const chunkText = chunks[currentChunkIdx++];
        const utterance = new SpeechSynthesisUtterance(chunkText);
        window._nainaUtteranceQueue.push(utterance); // Retain reference to prevent Mobile Garbage Collection

        if (hindiVoice) {
          utterance.voice = hindiVoice;
          utterance.lang = hindiVoice.lang || 'hi-IN';
        } else {
          utterance.lang = 'hi-IN';
        }

        utterance.rate = 0.98;
        utterance.pitch = 1.05;

        let chunkEnded = false;
        const handleChunkDone = () => {
          if (chunkEnded) return;
          chunkEnded = true;
          speakNextChunk();
        };

        utterance.onend = handleChunkDone;
        utterance.onerror = (err) => {
          console.warn('Chunk playback notice:', err);
          handleChunkDone();
        };

        // Chunk watchdog: Each short chunk shouldn't exceed 8 seconds
        setTimeout(() => {
          if (!chunkEnded && isSpeaking) {
            handleChunkDone();
          }
        }, Math.max(2000, chunkText.length * 120));

        try {
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        } catch (spErr) {
          console.warn('Speak chunk error:', spErr);
          handleChunkDone();
        }
      };

      speakNextChunk();
    };

    // Central function to send question to n8n AI Counselor and deliver audio answer
    const askNaina = async (queryText) => {
      const trimmedQuery = queryText.trim();
      if (!trimmedQuery) return;

      // Pre-warm speech token synchronously BEFORE entering async network wait
      warmUpMobileSpeech();

      // Release microphone audio focus so mobile OS can route to speaker output
      if (recognition && isListening) {
        try { recognition.stop(); } catch(e) {}
      }
      isListening = false;
      if (micBtn) micBtn.classList.remove('is-listening');
      if (micLabel) micLabel.textContent = 'बोलने के लिए दबाएं';

      // Display user question
      if (userMsg) {
        userMsg.style.display = 'block';
        userMsg.textContent = `👤 आप: "${trimmedQuery}"`;
        if (transcriptBox) transcriptBox.scrollTop = transcriptBox.scrollHeight;
      }

      if (statusText) statusText.textContent = 'नैना उत्तर तैयार कर रही हैं...';
      if (botMsg) botMsg.textContent = '...कृपया प्रतीक्षा करें...';

      // Dispatch to n8n webhook
      try {
        const response = await fetch(n8nWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendMessage',
            sessionId: voiceSessionId,
            chatInput: `[वॉयस कॉल] ${trimmedQuery}`
          })
        });

        const data = await response.json();
        let reply = (data && data.output) ? data.output : 'नमस्ते! आपका सवाल दर्ज हो गया है। क्या आप कोई अन्य जानकारी चाहते हैं?';
        reply = reply.replace(/^[=\s-]+/, '').trim();

        if (botMsg) {
          botMsg.textContent = reply;
          if (transcriptBox) transcriptBox.scrollTop = transcriptBox.scrollHeight;
        }

        // Delay 150ms to ensure mobile audio focus switches cleanly from microphone to speaker
        setTimeout(() => {
          speakHindi(reply);
        }, 150);
      } catch (err) {
        console.error('n8n voice webhook dispatch error:', err);
        const fallback = 'नमस्ते! मुझे आपका सवाल मिल गया है। आप सीधे हमारे हेल्पलाइन नंबर +91 98765 43210 पर भी संपर्क कर सकते हैं।';
        if (botMsg) botMsg.textContent = fallback;
        speakHindi(fallback);
      }
    };

    // Open Call Modal
    const startCall = () => {
      warmUpMobileSpeech();
      backdrop.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      voiceSessionId = 'voice_' + Date.now();
      if (statusText) statusText.textContent = 'कॉल कनेक्टेड (24/7 AI)';
      if (userMsg) userMsg.style.display = 'none';

      // Initial Courteous Greeting
      const greeting = 'नमस्ते! भावेश विद्या निकेतन में आपका स्वागत है। मैं 24/7 AI प्रवेश काउंसलर नैना बोल रही हूँ। आप मुझसे फीस, बस सुविधा या डायरेक्टर भावेश सर से मीटिंग के बारे में सीधे बोलकर या नीचे टैप करके पूछ सकते हैं।';
      if (botMsg) botMsg.textContent = `"${greeting}"`;

      speakHindi(greeting);
    };

    // Close Call Modal
    const endCall = () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognition && isListening) {
        try { recognition.stop(); } catch(e) {}
      }
      isListening = false;
      isSpeaking = false;
      backdrop.classList.remove('is-active');
      document.body.style.overflow = '';
      if (micBtn) micBtn.classList.remove('is-listening');
      if (avatarStage) avatarStage.classList.remove('is-speaking');
    };

    // Start Microphone Listening
    const startListening = () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        if (avatarStage) avatarStage.classList.remove('is-speaking');
      }

      if (!recognition) {
        alert('आपके इस ब्राउज़र में माइक्रोफ़ोन रिकग्निशन समर्थित नहीं है। आप नीचे दिए गए सुझाव बटन या टेक्स्ट बॉक्स से आसानी से पूछ सकते हैं!');
        return;
      }

      try {
        isListening = true;
        if (micBtn) micBtn.classList.add('is-listening');
        if (micLabel) micLabel.textContent = 'सुन रही हूँ... बोलिए';
        if (statusText) statusText.textContent = '🔴 सुन रही हूँ... कृपया बोलें';
        recognition.start();
      } catch (err) {
        console.warn('Recognition start state notice:', err);
        if (isListening) {
          try { recognition.stop(); } catch(e) {}
          isListening = false;
          if (micBtn) micBtn.classList.remove('is-listening');
          if (micLabel) micLabel.textContent = 'बोलने के लिए दबाएं';
        }
      }
    };

    // Speech Recognition Event Listeners
    if (recognition) {
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        if (transcript) {
          askNaina(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition notice:', event.error);
        isListening = false;
        if (micBtn) micBtn.classList.remove('is-listening');
        if (micLabel) micLabel.textContent = 'बोलने के लिए दबाएं';

        if (event.error === 'not-allowed') {
          if (statusText) statusText.textContent = '⚠️ माइक की अनुमति दें या नीचे सुझाव चुनें';
        } else {
          if (statusText) statusText.textContent = 'कॉल सक्रिय • बोलने के लिए माइक दबाएं';
        }
      };

      recognition.onend = () => {
        isListening = false;
        if (micBtn) micBtn.classList.remove('is-listening');
        if (micLabel) micLabel.textContent = 'बोलने के लिए दबाएं';
      };
    }

    // Attach Event Listeners to Open/Close Buttons
    if (openNavBtn) openNavBtn.addEventListener('click', startCall);
    if (openHeroBtn) openHeroBtn.addEventListener('click', startCall);
    if (openMobBtn) openMobBtn.addEventListener('click', startCall);
    if (closeBtn) closeBtn.addEventListener('click', endCall);
    if (endCallBtn) endCallBtn.addEventListener('click', endCall);

    // Microphone toggle button
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        warmUpMobileSpeech();
        if (isListening) {
          if (recognition) {
            try { recognition.stop(); } catch(e) {}
          }
          isListening = false;
          micBtn.classList.remove('is-listening');
          if (micLabel) micLabel.textContent = 'बोलने के लिए दबाएं';
          if (statusText) statusText.textContent = 'कॉल सक्रिय • बोलने के लिए माइक दबाएं';
        } else {
          startListening();
        }
      });
    }

    // Quick Question Chips Listener
    chipBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        warmUpMobileSpeech();
        const query = btn.getAttribute('data-query');
        if (query) {
          askNaina(query);
        }
      });
    });

    // Dual Fallback Text Input Form Listener
    if (textForm) {
      textForm.addEventListener('submit', (e) => {
        e.preventDefault();
        warmUpMobileSpeech();
        if (textInput && textInput.value.trim()) {
          const q = textInput.value.trim();
          textInput.value = '';
          askNaina(q);
        }
      });
    }

    // Close on backdrop outside click
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        endCall();
      }
    });
  };

  initNainaVoiceAssistant();

  // Log confirmation
  console.log('%c🏫 भावेश विद्या निकेतन (Bhavesh Vidya Niketan) %c| सत्र 2027-28 वेब पोर्टल सक्रिय', 
    'color: #d4af37; font-size: 14px; font-weight: bold; background: #08182b; padding: 4px 8px; border-radius: 4px;',
    'color: #059669; font-size: 13px;'
  );

});
