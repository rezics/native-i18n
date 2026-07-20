import {StrictMode, Suspense} from "react"
import {createRoot} from "react-dom/client"
import App from "./App"
import "./styles.css"

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<Suspense fallback={<p>Loading translations…</p>}>
			<App />
		</Suspense>
	</StrictMode>
)
