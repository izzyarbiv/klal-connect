// Local development server. Production runs the same app through
// api/index.js as a serverless function, which must not call listen().
import app from './app.js';

const PORT = Number(process.env.KC_PORT || 4000);

app.listen(PORT, () => console.log(`[klal-connect] API listening on http://localhost:${PORT}`));
