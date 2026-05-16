# Frontend Validation

## Decision

Use HTML, Bootstrap, Vanilla JavaScript, and Fetch.

Use Bootstrap/HTML5 validation on forms.

Backend validation remains mandatory.

## Reason

The assignment requires a user-friendly web application but does not require React. Lecturer frontend notes use HTML, JavaScript, and Fetch. Bootstrap provides a simple validation and UI approach without adding a frontend framework.

## Validation Layers

| Layer | Purpose |
|---|---|
| Frontend validation | improve user experience |
| Backend validation | enforce correctness and security |

## Frontend Example

```html
<form id="bookingForm" class="needs-validation" novalidate>
  <input class="form-control" id="startLocation" required>
  <input class="form-control" id="endLocation" required>

  <input class="form-control" id="passengers" type="number" min="1" max="8" required>

  <select class="form-select" id="cabType" required>
    <option value="">Choose cab type</option>
    <option value="Economic">Economic</option>
    <option value="Premium">Premium</option>
    <option value="Executive">Executive</option>
  </select>

  <button class="btn btn-primary" type="submit">Book Cab</button>
</form>
```

```js
const form = document.getElementById("bookingForm");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.classList.add("was-validated");
    return;
  }

  // send request to Gateway using fetch()
});
```

## Backend Still Required

Even if the frontend validates:
- Postman can call the API directly
- malicious users can bypass the browser
- frontend validation can fail or be disabled

Therefore every microservice must still validate request bodies and return JSON errors.

## Sources

- Lecturer frontend notes: HTML, JavaScript, Fetch, CORS
- Bootstrap validation documentation

## Assignment Tasks Supported

- Task 7: user-friendly web app
- Task 8: parse JSON and display results
- Task 11: smooth and error-free user experience
- Task 12: demo explanation
