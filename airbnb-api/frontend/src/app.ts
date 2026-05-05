type AppRole = "ADMIN" | "USER";
type ApiRole = "HOST" | "GUEST";

type ApiUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  role: ApiRole;
};

type Listing = {
  id: string;
  title: string;
  location: string;
  pricePerNight: number;
  host?: {
    name: string;
  };
};

type Booking = {
  id: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  listing?: {
    title: string;
  };
};

type AuthResponse = {
  token: string;
  user: ApiUser;
};

type ListingsResponse = {
  data: Listing[];
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  appRole: AppRole;
  apiRole: ApiRole;
  token: string;
};

const toApiRole = (role: AppRole): ApiRole => (role === "ADMIN" ? "HOST" : "GUEST");

const toAppRole = (role: ApiRole): AppRole => (role === "HOST" ? "ADMIN" : "USER");

const getSessionToken = (): string | null => {
  return sessionUser?.token ?? localStorage.getItem("airbnb-token");
};

const authHeaders = (): HeadersInit => {
  const token = getSessionToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const $ = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing element #${id}`);
  }
  return node as T;
};

const refs = {
  authView: $("auth-view") as HTMLElement,
  appView: $("app-view") as HTMLElement,
  showLoginBtn: $("show-login-btn") as HTMLButtonElement,
  showSignupBtn: $("show-signup-btn") as HTMLButtonElement,
  loginForm: $("login-form") as HTMLFormElement,
  signupForm: $("signup-form") as HTMLFormElement,
  forgotForm: $("forgot-form") as HTMLFormElement,
  showForgotBtn: $("show-forgot-btn") as HTMLButtonElement,
  backToLoginBtn: $("back-to-login-btn") as HTMLButtonElement,
  resetView: $("reset-view") as HTMLElement,
  resetForm: $("reset-form") as HTMLFormElement,
  welcomeText: $("welcome-text") as HTMLHeadingElement,
  refreshDataBtn: $("refresh-data-btn") as HTMLButtonElement,
  logoutBtn: $("logout-btn") as HTMLButtonElement,
  listingsGrid: $("listings-grid") as HTMLDivElement,
  adminSection: $("admin-section") as HTMLElement,
  userSection: $("user-section") as HTMLElement,
  activitySection: $("activity-section") as HTMLElement,
  createListingForm: $("create-listing-form") as HTMLFormElement,
  listingSubmitBtn: $("listing-submit-btn") as HTMLButtonElement,
  cancelEditBtn: $("cancel-edit-btn") as HTMLButtonElement,
  myListings: $("my-listings") as HTMLDivElement,
  createBookingForm: $("create-booking-form") as HTMLFormElement,
  bookingListingSelect: $("booking-listing-select") as HTMLSelectElement,
  myBookings: $("my-bookings") as HTMLDivElement,
  adminBookings: $("admin-bookings") as HTMLDivElement,
  logOutput: $("log-output") as HTMLPreElement
};

let users: ApiUser[] = [];
let listings: Listing[] = [];
let bookings: Booking[] = [];
let sessionUser: SessionUser | null = null;
let editingListingId: string | null = null;
let resetToken: string | null = null;

const log = (title: string, payload: unknown): void => {
  const time = new Date().toLocaleTimeString();
  const content = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  refs.logOutput.textContent = `[${time}] ${title}\n${content}\n\n${refs.logOutput.textContent}`;
};

const formatDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

const setAuthMode = (mode: "login" | "signup" | "forgot"): void => {
  refs.showLoginBtn.classList.toggle("active", mode === "login");
  refs.showSignupBtn.classList.toggle("active", mode === "signup");
  refs.loginForm.classList.toggle("hidden", mode !== "login");
  refs.signupForm.classList.toggle("hidden", mode !== "signup");
  refs.forgotForm.classList.toggle("hidden", mode !== "forgot");
  refs.showForgotBtn.classList.toggle("hidden", mode === "forgot");
};

const setViewBySession = (): void => {
  const loggedIn = Boolean(sessionUser);
  const resetting = Boolean(resetToken) && !loggedIn;
  refs.authView.classList.toggle("hidden", loggedIn || resetting);
  refs.resetView.classList.toggle("hidden", !resetting);
  refs.appView.classList.toggle("hidden", !loggedIn);

  if (resetting) return;

  if (!sessionUser) return;

  const isAdmin = sessionUser.appRole === "ADMIN";
  refs.welcomeText.textContent = `Welcome ${sessionUser.name} (${sessionUser.appRole})`;
  refs.adminSection.classList.toggle("hidden", !isAdmin);
  refs.userSection.classList.toggle("hidden", isAdmin);
  refs.activitySection.classList.toggle("hidden", !isAdmin);
};

const fetchUsers = async (): Promise<void> => {
  const response = await fetch("/users");
  const data = (await response.json()) as ApiUser[];
  users = data;
};

const fetchListings = async (): Promise<void> => {
  const response = await fetch("/listings");
  const data = (await response.json()) as ListingsResponse;
  listings = data.data;
};

const fetchBookings = async (): Promise<void> => {
  const response = await fetch("/bookings");
  bookings = (await response.json()) as Booking[];
};

const renderPublicListings = (): void => {
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

const renderMyListings = (mine: Listing[]): void => {
  refs.myListings.innerHTML = mine
    .map(
      (listing) => `
      <article class="card">
        <h3>${escapeHtml(listing.title)}</h3>
        <p>${escapeHtml(listing.location)}</p>
        <p>$${listing.pricePerNight} per night</p>
        <div class="row">
          <button type="button" class="secondary edit-listing-btn" data-listing-id="${listing.id}">Edit</button>
          <button type="button" class="danger delete-listing-btn" data-listing-id="${listing.id}">Delete</button>
        </div>
      </article>
    `
    )
    .join("");
};

const renderMyBookings = (mine: Booking[]): void => {
  refs.myBookings.innerHTML = mine
    .map(
      (booking) => `
      <article class="card">
        <h3>${escapeHtml(booking.listing?.title ?? "Listing")}</h3>
        <p>Check in: ${formatDate(booking.checkIn)}</p>
        <p>Check out: ${formatDate(booking.checkOut)}</p>
        <p>Total: $${booking.totalPrice}</p>
        <p>Status: ${booking.status}</p>
      </article>
    `
    )
    .join("");
};

const renderAdminBookings = (mine: Booking[]): void => {
  refs.adminBookings.innerHTML = mine
    .map(
      (booking) => `
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
    `
    )
    .join("");
};

const refreshDashboardData = async (): Promise<void> => {
  if (!sessionUser) return;

  await fetchListings();
  renderPublicListings();

  await fetchBookings();

  if (sessionUser.appRole === "ADMIN") {
    const response = await fetch(`/users/${sessionUser.id}/listings`, {
      headers: authHeaders()
    });
    const myListings = (await response.json()) as Listing[];
    renderMyListings(myListings);
    renderAdminBookings(bookings);
    log("Admin data refreshed", myListings);
    return;
  }

  const response = await fetch(`/users/${sessionUser.id}/bookings`, {
    headers: authHeaders()
  });
  const myBookings = (await response.json()) as Booking[];
  renderMyBookings(myBookings);
  log("User data refreshed", myBookings);
};

const login = async (event: SubmitEvent): Promise<void> => {
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

  const data = (await response.json()) as AuthResponse | { message?: string };
  if (!response.ok) {
    log("Login failed", data);
    return;
  }

  const auth = data as AuthResponse;

  sessionUser = {
    id: auth.user.id,
    name: auth.user.name,
    email: auth.user.email,
    appRole: toAppRole(auth.user.role),
    apiRole: auth.user.role,
    token: auth.token
  };

  localStorage.setItem("airbnb-session", JSON.stringify(sessionUser));
  localStorage.setItem("airbnb-token", auth.token);
  setViewBySession();
  await refreshDashboardData();
  log("Login success", sessionUser);
};

const signup = async (event: SubmitEvent): Promise<void> => {
  event.preventDefault();

  const formData = new FormData(refs.signupForm);
  const role = String(formData.get("role") ?? "USER") as AppRole;
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

  const loginData = (await loginResponse.json()) as AuthResponse | { message?: string };
  if (!loginResponse.ok) {
    log("Auto login failed", loginData);
    refs.signupForm.reset();
    setAuthMode("login");
    return;
  }

  const auth = loginData as AuthResponse;

  sessionUser = {
    id: auth.user.id,
    name: auth.user.name,
    email: auth.user.email,
    appRole: toAppRole(auth.user.role),
    apiRole: auth.user.role,
    token: auth.token
  };

  localStorage.setItem("airbnb-session", JSON.stringify(sessionUser));
  localStorage.setItem("airbnb-token", auth.token);
  refs.signupForm.reset();
  setViewBySession();
  await refreshDashboardData();
  log("Signup success", data);
};

const forgotPassword = async (event: SubmitEvent): Promise<void> => {
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

const resetPassword = async (event: SubmitEvent): Promise<void> => {
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

const logout = (): void => {
  sessionUser = null;
  localStorage.removeItem("airbnb-session");
  localStorage.removeItem("airbnb-token");
  setViewBySession();
  refs.myBookings.innerHTML = "";
  refs.myListings.innerHTML = "";
  refs.adminBookings.innerHTML = "";
  log("Logout", "Session ended");
};

const resetListingForm = (): void => {
  editingListingId = null;
  refs.createListingForm.reset();
  refs.createListingForm.elements.namedItem("listingId") &&
    ((refs.createListingForm.elements.namedItem("listingId") as HTMLInputElement).value = "");
  refs.listingSubmitBtn.textContent = "Post Listing";
  refs.cancelEditBtn.classList.add("hidden");
};

const createListing = async (event: SubmitEvent): Promise<void> => {
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

const startEditListing = (listingId: string): void => {
  const listing = listings.find((item) => item.id === listingId);
  if (!listing) return;

  editingListingId = listingId;
  (refs.createListingForm.elements.namedItem("listingId") as HTMLInputElement).value = listingId;
  (refs.createListingForm.elements.namedItem("title") as HTMLInputElement).value = listing.title;
  (refs.createListingForm.elements.namedItem("location") as HTMLInputElement).value = listing.location;
  (refs.createListingForm.elements.namedItem("pricePerNight") as HTMLInputElement).value = String(listing.pricePerNight);
  refs.listingSubmitBtn.textContent = "Update Listing";
  refs.cancelEditBtn.classList.remove("hidden");
};

const deleteListing = async (listingId: string): Promise<void> => {
  if (!sessionUser || sessionUser.appRole !== "ADMIN") return;

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

const updateBookingStatus = async (bookingId: string, status: "CONFIRMED" | "CANCELLED"): Promise<void> => {
  if (!sessionUser || sessionUser.appRole !== "ADMIN") return;

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

const createBooking = async (listingId: string, checkIn: string, checkOut: string): Promise<void> => {
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

const submitBookingForm = async (event: SubmitEvent): Promise<void> => {
  event.preventDefault();

  const formData = new FormData(refs.createBookingForm);
  const listingId = String(formData.get("listingId") ?? "");
  const checkIn = String(formData.get("checkIn") ?? "");
  const checkOut = String(formData.get("checkOut") ?? "");

  await createBooking(listingId, checkIn, checkOut);
  refs.createBookingForm.reset();
};

const quickBookFromCard = async (event: Event): Promise<void> => {
  const target = event.target as HTMLElement;
  if (!target.classList.contains("quick-book")) return;

  const listingId = target.getAttribute("data-listing-id") ?? "";
  const today = new Date();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

  await createBooking(listingId, toDateOnly(today), toDateOnly(tomorrow));
};

const restoreSession = (): void => {
  const saved = localStorage.getItem("airbnb-session");
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved) as SessionUser;
    if (parsed?.id && parsed?.apiRole && parsed?.name && parsed?.token) {
      sessionUser = parsed;
      localStorage.setItem("airbnb-token", parsed.token);
    }
  } catch {
    localStorage.removeItem("airbnb-session");
    localStorage.removeItem("airbnb-token");
  }
};

const bootstrap = async (): Promise<void> => {
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
    login(event).catch((error: unknown) => log("Login error", String(error)));
  });
  refs.signupForm.addEventListener("submit", (event) => {
    signup(event).catch((error: unknown) => log("Signup error", String(error)));
  });
  refs.forgotForm.addEventListener("submit", (event) => {
    forgotPassword(event).catch((error: unknown) => log("Forgot password error", String(error)));
  });
  refs.resetForm.addEventListener("submit", (event) => {
    resetPassword(event).catch((error: unknown) => log("Reset password error", String(error)));
  });
  refs.logoutBtn.addEventListener("click", logout);
  refs.refreshDataBtn.addEventListener("click", () => {
    refreshDashboardData().catch((error: unknown) => log("Refresh error", String(error)));
  });
  refs.cancelEditBtn.addEventListener("click", resetListingForm);
  refs.createListingForm.addEventListener("submit", (event) => {
    createListing(event).catch((error: unknown) => log("Create listing error", String(error)));
  });
  refs.createBookingForm.addEventListener("submit", (event) => {
    submitBookingForm(event).catch((error: unknown) => log("Create booking error", String(error)));
  });
  refs.listingsGrid.addEventListener("click", (event) => {
    quickBookFromCard(event).catch((error: unknown) => log("Quick booking error", String(error)));
  });
  refs.myListings.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const listingId = target.getAttribute("data-listing-id") ?? "";
    if (target.classList.contains("edit-listing-btn") && listingId) {
      startEditListing(listingId);
    }
    if (target.classList.contains("delete-listing-btn") && listingId) {
      deleteListing(listingId).catch((error: unknown) => log("Delete listing error", String(error)));
    }
  });
  refs.adminBookings.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const bookingId = target.getAttribute("data-booking-id") ?? "";
    if (target.classList.contains("booking-accept-btn") && bookingId) {
      updateBookingStatus(bookingId, "CONFIRMED").catch((error: unknown) => log("Accept booking error", String(error)));
    }
    if (target.classList.contains("booking-cancel-btn") && bookingId) {
      updateBookingStatus(bookingId, "CANCELLED").catch((error: unknown) => log("Cancel booking error", String(error)));
    }
  });

  await fetchListings();
  renderPublicListings();

  if (sessionUser) {
    await refreshDashboardData();
  }
};

bootstrap().catch((error: unknown) => {
  log("Startup error", String(error));
});
