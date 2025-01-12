const LOG_PREFIX = '[NMT]';

const LOG_STYLES = {
    MAIN_TITLE: {
        context: '[Main Title]',
        color: '#fcd34d'  // yellow
    },
    OTHER_TITLES: {
        context: '[Other Titles]',
        color: '#fca5a5'  // light red
    },
    DESCRIPTION: {
        context: '[Description]',
        color: '#86efac'  // light green
    },
    AUDIO: {
        context: '[Audio]',
        color: '#93c5fd'  // light blue
    },
    CORE: {
        context: '[Core]',
        color: '#c084fc'  // light purple
    }
} as const;

function createLogger(category: { context: string; color: string }) {
    return (message: string, ...args: any[]) => {
        console.log(
            `%c${LOG_PREFIX}${category.context} ${message}`,
            `color: ${category.color}`,
            ...args
        );
    };
}

const mainTitleLog = createLogger(LOG_STYLES.MAIN_TITLE);
const otherTitlesLog = createLogger(LOG_STYLES.OTHER_TITLES);
const audioLog = createLogger(LOG_STYLES.AUDIO);
const descriptionLog = createLogger(LOG_STYLES.DESCRIPTION);
const coreLog = createLogger(LOG_STYLES.CORE);