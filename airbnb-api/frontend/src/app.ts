type AppRole = "ADMIN" | "USER";
type ApiRole = "HOST" | "GUEST";

type ApiUser = {
  id: number;
  name: string;
  email: string;
  username: string;
  phone: string;
  role: ApiRole;
};

type Listing = {
  id: number;
  title: string;
  location: string;
  pricePerNight: number;
  host?: {
    name: string;
  };
};

type Booking = {
  id: number;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  listing?: {
    title: string;
  };
};

type ListingsResponse = {
  data: Listing[];
};

type SessionUser = {
  id: number;
  name: string;
  email: string;
  appRole: AppRole;
  apiRole: ApiRole;
};

const toApiRole = (role: AppRole): ApiRole => (role === "ADMIN" ? "HOST" : "GUEST");

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
let editingListingId: number | null = null;

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

const setAuthTab = (tab: "login" | "signup"): void => {
  refs.showLoginBtn.classList.toggle("active", tab === "login");
  refs.showSignupBtn.classList.toggle("active", tab === "signup");
  refs.loginForm.classList.toggle("hidden", tab !== "login");
  refs.signupForm.classList.toggle("hidden", tab !== "signup");
};

const setViewBySession = (): void => {
  const loggedIn = Boolean(sessionUser);
  refs.authView.classList.toggle("hidden", loggedIn);
  refs.appView.classList.toggle("hidden", !loggedIn);

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
    const response = await fetch(`/users/${sessionUser.id}/listings`);
    const myListings = (await response.json()) as Listing[];
    renderMyListings(myListings);
    renderAdminBookings(bookings);
    log("Admin data refreshed", myListings);
    return;
  }

  const response = await fetch(`/users/${sessionUser.id}/bookings`);
  const myBookings = (await response.json()) as Booking[];
  renderMyBookings(myBookings);
  log("User data refreshed", myBookings);
};

const login = async (event: SubmitEvent): Promise<void> => {
  event.preventDefault();

  const formData = new FormData(refs.loginForm);
  const emailOrUsername = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "USER") as AppRole;

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

const signup = async (event: SubmitEvent): Promise<void> => {
  event.preventDefault();

  const formData = new FormData(refs.signupForm);
  const role = String(formData.get("role") ?? "USER") as AppRole;
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
    apiRole: data.role as ApiRole
  };

  localStorage.setItem("airbnb-session", JSON.stringify(sessionUser));
  refs.signupForm.reset();
  setViewBySession();
  await refreshDashboardData();
  log("Signup success", data);
};

const logout = (): void => {
  sessionUser = null;
  localStorage.removeItem("airbnb-session");
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

const startEditListing = (listingId: number): void => {
  const listing = listings.find((item) => item.id === listingId);
  if (!listing) return;

  editingListingId = listingId;
  (refs.createListingForm.elements.namedItem("listingId") as HTMLInputElement).value = String(listingId);
  (refs.createListingForm.elements.namedItem("title") as HTMLInputElement).value = listing.title;
  (refs.createListingForm.elements.namedItem("location") as HTMLInputElement).value = listing.location;
  (refs.createListingForm.elements.namedItem("pricePerNight") as HTMLInputElement).value = String(listing.pricePerNight);
  refs.listingSubmitBtn.textContent = "Update Listing";
  refs.cancelEditBtn.classList.remove("hidden");
};

const deleteListing = async (listingId: number): Promise<void> => {
  if (!sessionUser || sessionUser.appRole !== "ADMIN") return;

  const response = await fetch(`/listings/${listingId}`, { method: "DELETE" });
  const data = await response.json();
  if (!response.ok) {
    log("Delete listing failed", data);
    return;
  }

  await refreshDashboardData();
  log("Listing deleted", data);
};

const updateBookingStatus = async (bookingId: number, status: "CONFIRMED" | "CANCELLED"): Promise<void> => {
  if (!sessionUser || sessionUser.appRole !== "ADMIN") return;

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

const createBooking = async (listingId: number, checkIn: string, checkOut: string): Promise<void> => {
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

const submitBookingForm = async (event: SubmitEvent): Promise<void> => {
  event.preventDefault();

  const formData = new FormData(refs.createBookingForm);
  const listingId = Number(formData.get("listingId") ?? 0);
  const checkIn = String(formData.get("checkIn") ?? "");
  const checkOut = String(formData.get("checkOut") ?? "");

  await createBooking(listingId, checkIn, checkOut);
  refs.createBookingForm.reset();
};

const quickBookFromCard = async (event: Event): Promise<void> => {
  const target = event.target as HTMLElement;
  if (!target.classList.contains("quick-book")) return;

  const listingId = Number(target.getAttribute("data-listing-id") ?? 0);
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
    if (parsed?.id && parsed?.apiRole && parsed?.name) {
      sessionUser = parsed;
    }
  } catch {
    localStorage.removeItem("airbnb-session");
  }
};

const bootstrap = async (): Promise<void> => {
  setAuthTab("login");
  restoreSession();
  setViewBySession();

  refs.showLoginBtn.addEventListener("click", () => setAuthTab("login"));
  refs.showSignupBtn.addEventListener("click", () => setAuthTab("signup"));
  refs.loginForm.addEventListener("submit", (event) => {
    login(event).catch((error: unknown) => log("Login error", String(error)));
  });
  refs.signupForm.addEventListener("submit", (event) => {
    signup(event).catch((error: unknown) => log("Signup error", String(error)));
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
    const listingId = Number(target.getAttribute("data-listing-id") ?? 0);
    if (target.classList.contains("edit-listing-btn") && listingId) {
      startEditListing(listingId);
    }
    if (target.classList.contains("delete-listing-btn") && listingId) {
      deleteListing(listingId).catch((error: unknown) => log("Delete listing error", String(error)));
    }
  });
  refs.adminBookings.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const bookingId = Number(target.getAttribute("data-booking-id") ?? 0);
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
