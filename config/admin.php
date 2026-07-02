<?php

return [
    // The admin username is fixed by product requirement.
    'username' => env('ADMIN_USERNAME', 'Asset Admin'),

    // The 64-character admin access password (see .env).
    'password' => env('ADMIN_PASSWORD'),

    // Passwords must be exactly this many characters.
    'password_length' => 64,
];
