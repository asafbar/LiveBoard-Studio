import styles from "./App.module.css";

function App() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-100">
            <section className={styles.panel}>
                <h1 className={styles.title}>LiveBoard Studio</h1>
                <p className={styles.message}>Frontend environment ready</p>
            </section>
        </main>
    );
}

export default App;
