# Task Category Photo Credits

Dashboard task cards use category-specific photography from Unsplash. Each source page identifies the photo as free to use under the Unsplash License. The images are decorative; the category and task text remain available in the card itself.

| Category | Photographer | Source |
| --- | --- | --- |
| Errands | Stephen Han | [Shopping cart with groceries](https://unsplash.com/photos/a-person-pushing-a-shopping-cart-full-of-bags-EzQHGqYtErQ) |
| Delivery | Charles Puaud | [Delivery person on a bicycle](https://unsplash.com/photos/delivery-person-with-a-yellow-backpack-on-a-bicycle-3EGuF0LvPPM) |
| Cleaning | James Lo | [Cleaning supplies and tools](https://unsplash.com/photos/assorted-cleaning-supplies-and-tools-on-a-counter-q2nkH-OpBNo) |
| Repairs | Toni Reed | [Hand tools in a tool bag](https://unsplash.com/photos/close-up-of-a-tool-bag-with-various-items-inside-IYgVzZrZeOw) |
| Moving | Luke Heibert | [Moving boxes](https://unsplash.com/photos/a-lot-of-brown-boxes-that-are-open-gthSas4oYC0) |
| Tutoring | Vitaly Gariev | [Tutor helping a student](https://unsplash.com/photos/teacher-helping-young-student-with-math-problems-at-desk-wr2OzAO5fpc) |
| Writing | Julio Lopez | [Writing and studying at a desk](https://unsplash.com/photos/a-young-woman-studying-and-writing-notes-at-a-desk-Juj-Mi2b0DA) |
| Design | Josefa nDiaz | [Designer using a drawing tablet](https://unsplash.com/photos/woman-using-drawing-pad-while-sitting-in-front-of-laptop-IzmdWT2lW5Q) |
| Translation | Ling App | [Translation lettering](https://unsplash.com/photos/a-wooden-block-that-says-translation-on-it-p5VW_ZUon7o) |

Task creation uses the canonical launch category list in `src/lib/tasks/policy.ts`. Local tasks offer Errands, Delivery, Cleaning, Repairs, Moving, and Tutoring. Remote tasks offer Tutoring, Writing, Design, and Translation. Validation rejects categories that are unknown or incompatible with the chosen fulfillment mode.
