"use strict";
const toApiRole = (role) => (role === "ADMIN" ? "HOST" : "GUEST");
const $ = (id) => {
    const node = document.getElementById(id);
    if (!node) {
        throw new Error(`Missing element #${id}`);
    }
    return node;
};
const refs = {
    authView: $("auth-view"),
    appView: $("app-view"),
    showLoginBtn: $("show-login-btn"),
    showSignupBtn: $("show-signup-btn"),
    loginForm: $("login-form"),
    signupForm: $("signup-form"),
    welcomeText: $("welcome-text"),
    refreshDataBtn: $("refresh-data-btn"),
    logoutBtn: $("logout-btn"),
    listingsGrid: $("listings-grid"),
    adminSection: $("admin-section"),
    userSection: $("user-section"),
    activitySection: $("activity-section"),
    createListingForm: $("create-listing-form"),
    listingSubmitBtn: $("listing-submit-btn"),
    cancelEditBtn: $("cancel-edit-btn"),
    myListings: $("my-listings"),
    createBookingForm: $("create-booking-form"),
    bookingListingSelect: $("booking-listing-select"),
    myBookings: $("my-bookings"),
    adminBookings: $("admin-bookings"),
    logOutput: $("log-output")
};
let users = [];
let listings = [];
let bookings = [];
let sessionUser = null;
let editingListingId = null;
const log = (title, payload) => {
    const time = new Date().toLocaleTimeString();
    const content = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
    refs.logOutput.textContent = `[${time}] ${title}\n${content}\n\n${refs.logOutput.textContent}`;
};
const formatDate = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return value;
    return parsed.toLocaleDateString();
};
const escapeHtml = (value) => {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
};
const setAuthTab = (tab) => {
    refs.showLoginBtn.classList.toggle("active", tab === "login");
    refs.showSignupBtn.classList.toggle("active", tab === "signup");
    refs.loginForm.classList.toggle("hidden", tab !== "login");
    refs.signupForm.classList.toggle("hidden", tab !== "signup");
};
const setViewBySession = () => {
    const loggedIn = Boolean(sessionUser);
    refs.authView.classList.toggle("hidden", loggedIn);
    refs.appView.classList.toggle("hidden", !loggedIn);
    if (!sessionUser)
        return;
    const isAdmin = sessionUser.appRole === "ADMIN";
    refs.welcomeText.textContent = `Welcome ${sessionUser.name} (${sessionUser.appRole})`;
    refs.adminSection.classList.toggle("hidden", !isAdmin);
    refs.userSection.classList.toggle("hidden", isAdmin);
    refs.activitySection.classList.toggle("hidden", !isAdmin);
};
const fetchUsers = async () => {
    const response = await fetch("/users");
    const data = (await response.json());
    users = data;
};
const fetchListings = async () => {
    const response = await fetch("/listings");
    const data = (await response.json());
    listings = data.data;
};
const fetchBookings = async () => {
    const response = await fetch("/bookings");
    bookings = (await response.json());
};
const renderPublicListings = () => {
    const isUser = sessionUser?.appRole === "USER";
    const isAdmin = sessionUser?.appRole === "ADMIN";
    refs.listingsGrid.innerHTML = listings
        .map((listing) => {
        const hostName = listing.host?.name ?? "Host";
        return `
        <article class="card">
          <h3>${escapeHtml(listing.title)}</h3>
          <p>${escapeHtml(listing.location)}</p>
          <p>$${listing.pricePerNight} per night</p>
          <p>Host: ${escapeHtml(hostName)}</p>
          ${isUser ? `<button class="cta quick-book" type="button" data-listing-id="${listing.id}">Book This</button>` : ""}
        </article>
      `;
    })
        .join("");
    refs.bookingListingSelect.innerHTML = listings
        .map((listing) => `<option value="${listing.id}">${escapeHtml(listing.title)} - ${escapeHtml(listing.location)}</option>`)
        .join("");
};
const renderMyListings = (mine) => {
    refs.myListings.innerHTML = mine
        .map((listing) => `
      <article class="card">
        <h3>${escapeHtml(listing.title)}</h3>
        <p>${escapeHtml(listing.location)}</p>
        <p>$${listing.pricePerNight} per night</p>
        <div class="row">
          <button type="button" class="secondary edit-listing-btn" data-listing-id="${listing.id}">Edit</button>
          <button type="button" class="danger delete-listing-btn" data-listing-id="${listing.id}">Delete</button>
        </div>
      </article>
    `)
        .join("");
};
const renderMyBookings = (mine) => {
    refs.myBookings.innerHTML = mine
        .map((booking) => `
      <article class="card">
        <h3>${escapeHtml(booking.listing?.title ?? "Listing")}</h3>
        <p>Check in: ${formatDate(booking.checkIn)}</p>
        <p>Check out: ${formatDate(booking.checkOut)}</p>
        <p>Total: $${booking.totalPrice}</p>
        <p>Status: ${booking.status}</p>
      </article>
    `)
        .join("");
};
const renderAdminBookings = (mine) => {
    refs.adminBookings.innerHTML = mine
        .map((booking) => `
      <article class="card">
        <h3>${escapeHtml(booking.listing?.title ?? "Listing")}</h3>
        <p>Check in: ${formatDate(booking.checkIn)}</p>
        <p>Check out: ${formatDate(booking.checkOut)}</p>
        <p>Status: ${booking.status}</p>
        <div class="row">
          <button type="button" class="secondary booking-accept-btn" data-booking-id="${booking.id}">Accept</button>
          <button type="button" class="danger booking-cancel-btn" data-booking-id="${booking.id}">Cancel</button>
        </div>
      </article>
    `)
        .join("");
};
const refreshDashboardData = async () => {
    if (!sessionUser)
        return;
    await fetchListings();
    renderPublicListings();
    await fetchBookings();
    if (sessionUser.appRole === "ADMIN") {
        const response = await fetch(`/users/${sessionUser.id}/listings`);
        const myListings = (await response.json());
        renderMyListings(myListings);
        renderAdminBookings(bookings);
        log("Admin data refreshed", myListings);
        return;
    }
    const response = await fetch(`/users/${sessionUser.id}/bookings`);
    const myBookings = (await response.json());
    renderMyBookings(myBookings);
    log("User data refreshed", myBookings);
};
const login = async (event) => {
    event.preventDefault();
    const formData = new FormData(refs.loginForm);
    const emailOrUsername = String(formData.get("email") ?? "").trim().toLowerCase();
    const role = String(formData.get("role") ?? "USER");
    await fetchUsers();
    const baseMatch = users.find((candidate) => {
        const byEmail = candidate.email.toLowerCase() === emailOrUsername;
        const byUsername = candidate.username.toLowerCase() === emailOrUsername;
        return byEmail || byUsername;
    });
    if (!baseMatch) {
        log("Login failed", "No account found with this email or username. Try signup first.");
        return;
    }
    sessionUser = {
        id: baseMatch.id,
        name: baseMatch.name,
        email: baseMatch.email,
        appRole: role,
        apiRole: baseMatch.role
    };
    localStorage.setItem("airbnb-session", JSON.stringify(sessionUser));
    setViewBySession();
    await refreshDashboardData();
    log("Login success", sessionUser);
};
const signup = async (event) => {
    event.preventDefault();
    const formData = new FormData(refs.signupForm);
    const role = String(formData.get("role") ?? "USER");
    const payload = {
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
        username: String(formData.get("username") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        role: toApiRole(role)
    };
    const response = await fetch("/users", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
        log("Signup failed", data);
        return;
    }
    sessionUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        appRole: role,
        apiRole: data.role
    };
    localStorage.setItem("airbnb-session", JSON.stringify(sessionUser));
    refs.signupForm.reset();
    setViewBySession();
    await refreshDashboardData();
    log("Signup success", data);
};
const logout = () => {
    sessionUser = null;
    localStorage.removeItem("airbnb-session");
    setViewBySession();
    refs.myBookings.innerHTML = "";
    refs.myListings.innerHTML = "";
    refs.adminBookings.innerHTML = "";
    log("Logout", "Session ended");
};
const resetListingForm = () => {
    editingListingId = null;
    refs.createListingForm.reset();
    refs.createListingForm.elements.namedItem("listingId") &&
        (refs.createListingForm.elements.namedItem("listingId").value = "");
    refs.listingSubmitBtn.textContent = "Post Listing";
    refs.cancelEditBtn.classList.add("hidden");
};
const createListing = async (event) => {
    event.preventDefault();
    if (!sessionUser || sessionUser.appRole !== "ADMIN") {
        log("Create listing blocked", "Only admin can post listings");
        return;
    }
    const formData = new FormData(refs.createListingForm);
    const amenities = String(formData.get("amenities") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const payload = {
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        location: String(formData.get("location") ?? ""),
        pricePerNight: Number(formData.get("pricePerNight") ?? 0),
        guests: Number(formData.get("guests") ?? 0),
        type: String(formData.get("type") ?? "APARTMENT"),
        amenities,
        hostId: sessionUser.id
    };
    const isEditing = editingListingId !== null;
    const response = await fetch(isEditing ? `/listings/${editingListingId}` : "/listings", {
        method: isEditing ? "PUT" : "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
        log("Create listing failed", data);
        return;
    }
    resetListingForm();
    await refreshDashboardData();
    log(isEditing ? "Listing updated" : "Listing posted", data);
};
const startEditListing = (listingId) => {
    const listing = listings.find((item) => item.id === listingId);
    if (!listing)
        return;
    editingListingId = listingId;
    refs.createListingForm.elements.namedItem("listingId").value = String(listingId);
    refs.createListingForm.elements.namedItem("title").value = listing.title;
    refs.createListingForm.elements.namedItem("location").value = listing.location;
    refs.createListingForm.elements.namedItem("pricePerNight").value = String(listing.pricePerNight);
    refs.listingSubmitBtn.textContent = "Update Listing";
    refs.cancelEditBtn.classList.remove("hidden");
};
const deleteListing = async (listingId) => {
    if (!sessionUser || sessionUser.appRole !== "ADMIN")
        return;
    const response = await fetch(`/listings/${listingId}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
        log("Delete listing failed", data);
        return;
    }
    await refreshDashboardData();
    log("Listing deleted", data);
};
const updateBookingStatus = async (bookingId, status) => {
    if (!sessionUser || sessionUser.appRole !== "ADMIN")
        return;
    const response = await fetch(`/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (!response.ok) {
        log("Update booking failed", data);
        return;
    }
    await refreshDashboardData();
    log(`Booking ${status.toLowerCase()}`, data);
};
const createBooking = async (listingId, checkIn, checkOut) => {
    if (!sessionUser || sessionUser.appRole !== "USER") {
        log("Create booking blocked", "Only user can create bookings");
        return;
    }
    const payload = {
        guestId: sessionUser.id,
        listingId,
        checkIn,
        checkOut
    };
    const response = await fetch("/bookings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
        log("Create booking failed", data);
        return;
    }
    await refreshDashboardData();
    log("Booking created", data);
};
const submitBookingForm = async (event) => {
    event.preventDefault();
    const formData = new FormData(refs.createBookingForm);
    const listingId = Number(formData.get("listingId") ?? 0);
    const checkIn = String(formData.get("checkIn") ?? "");
    const checkOut = String(formData.get("checkOut") ?? "");
    await createBooking(listingId, checkIn, checkOut);
    refs.createBookingForm.reset();
};
const quickBookFromCard = async (event) => {
    const target = event.target;
    if (!target.classList.contains("quick-book"))
        return;
    const listingId = Number(target.getAttribute("data-listing-id") ?? 0);
    const today = new Date();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const toDateOnly = (date) => date.toISOString().slice(0, 10);
    await createBooking(listingId, toDateOnly(today), toDateOnly(tomorrow));
};
const restoreSession = () => {
    const saved = localStorage.getItem("airbnb-session");
    if (!saved)
        return;
    try {
        const parsed = JSON.parse(saved);
        if (parsed?.id && parsed?.apiRole && parsed?.name) {
            sessionUser = parsed;
        }
    }
    catch {
        localStorage.removeItem("airbnb-session");
    }
};
const bootstrap = async () => {
    setAuthTab("login");
    restoreSession();
    setViewBySession();
    refs.showLoginBtn.addEventListener("click", () => setAuthTab("login"));
    refs.showSignupBtn.addEventListener("click", () => setAuthTab("signup"));
    refs.loginForm.addEventListener("submit", (event) => {
        login(event).catch((error) => log("Login error", String(error)));
    });
    refs.signupForm.addEventListener("submit", (event) => {
        signup(event).catch((error) => log("Signup error", String(error)));
    });
    refs.logoutBtn.addEventListener("click", logout);
    refs.refreshDataBtn.addEventListener("click", () => {
        refreshDashboardData().catch((error) => log("Refresh error", String(error)));
    });
    refs.cancelEditBtn.addEventListener("click", resetListingForm);
    refs.createListingForm.addEventListener("submit", (event) => {
        createListing(event).catch((error) => log("Create listing error", String(error)));
    });
    refs.createBookingForm.addEventListener("submit", (event) => {
        submitBookingForm(event).catch((error) => log("Create booking error", String(error)));
    });
    refs.listingsGrid.addEventListener("click", (event) => {
        quickBookFromCard(event).catch((error) => log("Quick booking error", String(error)));
    });
    refs.myListings.addEventListener("click", (event) => {
        const target = event.target;
        const listingId = Number(target.getAttribute("data-listing-id") ?? 0);
        if (target.classList.contains("edit-listing-btn") && listingId) {
            startEditListing(listingId);
        }
        if (target.classList.contains("delete-listing-btn") && listingId) {
            deleteListing(listingId).catch((error) => log("Delete listing error", String(error)));
        }
    });
    refs.adminBookings.addEventListener("click", (event) => {
        const target = event.target;
        const bookingId = Number(target.getAttribute("data-booking-id") ?? 0);
        if (target.classList.contains("booking-accept-btn") && bookingId) {
            updateBookingStatus(bookingId, "CONFIRMED").catch((error) => log("Accept booking error", String(error)));
        }
        if (target.classList.contains("booking-cancel-btn") && bookingId) {
            updateBookingStatus(bookingId, "CANCELLED").catch((error) => log("Cancel booking error", String(error)));
        }
    });
    await fetchListings();
    renderPublicListings();
    if (sessionUser) {
        await refreshDashboardData();
    }
};
bootstrap().catch((error) => {
    log("Startup error", String(error));
});
