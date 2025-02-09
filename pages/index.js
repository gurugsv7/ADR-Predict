import styles from '../styles/Home.module.css'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <span>Your App</span>
        </h1>

        <div className={styles.grid}>
          <motion.div 
            className={styles.card}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <h2>Feature One</h2>
            <p className={styles.description}>
              Description of your first major feature
            </p>
          </motion.div>

          <motion.div 
            className={styles.card}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <h2>Feature Two</h2>
            <p className={styles.description}>
              Description of your second major feature
            </p>
          </motion.div>

          <motion.div 
            className={styles.card}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <h2>Feature Three</h2>
            <p className={styles.description}>
              Description of your third major feature
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
