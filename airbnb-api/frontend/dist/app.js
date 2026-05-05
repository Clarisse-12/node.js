"use strict";
const toApiRole = (role) => (role === "ADMIN" ? "HOST" : "GUEST");
const toAppRole = (role) => (role === "HOST" ? "ADMIN" : "USER");
const getSessionToken = () => {
    return sessionUser?.token ?? localStorage.getItem("airbnb-token");
};
const authHeaders = () => {
    const token = getSessionToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};
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
    forgotForm: $("forgot-form"),
    showForgotBtn: $("show-forgot-btn"),
    backToLoginBtn: $("back-to-login-btn"),
    resetView: $("reset-view"),
    resetForm: $("reset-form"),
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
let resetToken = null;
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
const setAuthMode = (mode) => {
    refs.showLoginBtn.classList.toggle("active", mode === "login");
    refs.showSignupBtn.classList.toggle("active", mode === "signup");
    refs.loginForm.classList.toggle("hidden", mode !== "login");
    refs.signupForm.classList.toggle("hidden", mode !== "signup");
    refs.forgotForm.classList.toggle("hidden", mode !== "forgot");
    refs.showForgotBtn.classList.toggle("hidden", mode === "forgot");
};
const setViewBySession = () => {
    const loggedIn = Boolean(sessionUser);
    const resetting = Boolean(resetToken) && !loggedIn;
    refs.authView.classList.toggle("hidden", loggedIn || resetting);
    refs.resetView.classList.toggle("hidden", !resetting);
    refs.appView.classList.toggle("hidden", !loggedIn);
    if (resetting)
        return;
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
        const response = await fetch(`/users/${sessionUser.id}/listings`, {
            headers: authHeaders()
        });
        const myListings = (await response.json());
        renderMyListings(myListings);
        renderAdminBookings(bookings);
        log("Admin data refreshed", myListings);
        return;
    }
    const response = await fetch(`/users/${sessionUser.id}/bookings`, {
        headers: authHeaders()
    });
    const myBookings = (await response.json());
    renderMyBookings(myBookings);
    log("User data refreshed", myBookings);
};
const login = async (event) => {
    event.preventDefault();
    const formData = new FormData(refs.loginForm);
    const payload = {
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
        password: String(formData.get("password") ?? "")
    };
    const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const data = (await response.json());
    if (!response.ok) {
        log("Login failed", data);
        return;
    }
    sessionUser = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        appRole: toAppRole(data.user.role),
        apiRole: data.user.role,
        token: data.token
    };
    localStorage.setItem("airbnb-session", JSON.stringify(sessionUser));
    localStorage.setItem("airbnb-token", data.token);
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
        password: String(formData.get("password") ?? ""),
        role: toApiRole(role)
    };
    const response = await fetch("/api/v1/auth/register", {
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
    const loginResponse = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: payload.email, password: payload.password })
    });
    const loginData = (await loginResponse.json());
    if (!loginResponse.ok) {
        log("Auto login failed", loginData);
        refs.signupForm.reset();
        setAuthMode("login");
        return;
    }
    sessionUser = {
        id: loginData.user.id,
        name: loginData.user.name,
        email: loginData.user.email,
        appRole: toAppRole(loginData.user.role),
        apiRole: loginData.user.role,
        token: loginData.token
    };
    localStorage.setItem("airbnb-session", JSON.stringify(sessionUser));
    localStorage.setItem("airbnb-token", loginData.token);
    refs.signupForm.reset();
    setViewBySession();
    await refreshDashboardData();
    log("Signup success", data);
};
const forgotPassword = async (event) => {
    event.preventDefault();
    const formData = new FormData(refs.forgotForm);
    const payload = {
        email: String(formData.get("email") ?? "").trim().toLowerCase()
    };
    const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
        log("Forgot password failed", data);
        return;
    }
    refs.forgotForm.reset();
    setAuthMode("login");
    log("Forgot password", data);
};
const resetPassword = async (event) => {
    event.preventDefault();
    if (!resetToken) {
        log("Reset password failed", "Missing reset token");
        return;
    }
    const formData = new FormData(refs.resetForm);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    if (newPassword !== confirmPassword) {
        log("Reset password failed", "Passwords do not match");
        return;
    }
    const response = await fetch(`/api/v1/auth/reset-password/${resetToken}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ newPassword })
    });
    const data = await response.json();
    if (!response.ok) {
        log("Reset password failed", data);
        return;
    }
    resetToken = null;
    refs.resetForm.reset();
    window.history.replaceState({}, "", "/app");
    setAuthMode("login");
    setViewBySession();
    log("Reset password", data);
};
const logout = () => {
    sessionUser = null;
    localStorage.removeItem("airbnb-session");
    localStorage.removeItem("airbnb-token");
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
            "Content-Type": "application/json",
            ...authHeaders()
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
    refs.createListingForm.elements.namedItem("listingId").value = listingId;
    refs.createListingForm.elements.namedItem("title").value = listing.title;
    refs.createListingForm.elements.namedItem("location").value = listing.location;
    refs.createListingForm.elements.namedItem("pricePerNight").value = String(listing.pricePerNight);
    refs.listingSubmitBtn.textContent = "Update Listing";
    refs.cancelEditBtn.classList.remove("hidden");
};
const deleteListing = async (listingId) => {
    if (!sessionUser || sessionUser.appRole !== "ADMIN")
        return;
    const response = await fetch(`/listings/${listingId}`, {
        method: "DELETE",
        headers: authHeaders()
    });
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
            "Content-Type": "application/json",
            ...authHeaders()
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
        listingId,
        checkIn,
        checkOut
    };
    const response = await fetch("/bookings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...authHeaders()
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
    const listingId = String(formData.get("listingId") ?? "");
    const checkIn = String(formData.get("checkIn") ?? "");
    const checkOut = String(formData.get("checkOut") ?? "");
    await createBooking(listingId, checkIn, checkOut);
    refs.createBookingForm.reset();
};
const quickBookFromCard = async (event) => {
    const target = event.target;
    if (!target.classList.contains("quick-book"))
        return;
    const listingId = target.getAttribute("data-listing-id") ?? "";
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
        if (parsed?.id && parsed?.apiRole && parsed?.name && parsed?.token) {
            sessionUser = parsed;
            localStorage.setItem("airbnb-token", parsed.token);
        }
    }
    catch {
        localStorage.removeItem("airbnb-session");
        localStorage.removeItem("airbnb-token");
    }
};
const bootstrap = async () => {
    const url = new URL(window.location.href);
    resetToken = url.searchParams.get("resetToken");
    if (!resetToken) {
        setAuthMode("login");
    }
    restoreSession();
    setViewBySession();
    refs.showLoginBtn.addEventListener("click", () => setAuthMode("login"));
    refs.showSignupBtn.addEventListener("click", () => setAuthMode("signup"));
    refs.showForgotBtn.addEventListener("click", () => setAuthMode("forgot"));
    refs.backToLoginBtn.addEventListener("click", () => setAuthMode("login"));
    refs.loginForm.addEventListener("submit", (event) => {
        login(event).catch((error) => log("Login error", String(error)));
    });
    refs.signupForm.addEventListener("submit", (event) => {
        signup(event).catch((error) => log("Signup error", String(error)));
    });
    refs.forgotForm.addEventListener("submit", (event) => {
        forgotPassword(event).catch((error) => log("Forgot password error", String(error)));
    });
    refs.resetForm.addEventListener("submit", (event) => {
        resetPassword(event).catch((error) => log("Reset password error", String(error)));
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
        const listingId = target.getAttribute("data-listing-id") ?? "";
        if (target.classList.contains("edit-listing-btn") && listingId) {
            startEditListing(listingId);
        }
        if (target.classList.contains("delete-listing-btn") && listingId) {
            deleteListing(listingId).catch((error) => log("Delete listing error", String(error)));
        }
    });
    refs.adminBookings.addEventListener("click", (event) => {
        const target = event.target;
        const bookingId = target.getAttribute("data-booking-id") ?? "";
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
