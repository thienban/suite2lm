import React, { useEffect, useState } from 'react';

interface DynamicValueProps {
    query: string;
}

export const DynamicValue: React.FC<DynamicValueProps> = ({ query }) => {
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Debounce or just fetch on mount/query change?
    // Since it's dynamic, maybe we should re-fetch periodically or listen to events?
    // For MVP, just fetch once.

    useEffect(() => {
        if (!query) return;

        let isMounted = true;
        setLoading(true);

        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:8080/api/db/query', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query }),
                });

                if (!res.ok) throw new Error('Query failed');

                const data = await res.json();

                if (isMounted) {
                    if (data.data && data.data.length > 0) {
                        // Extract first value of first row
                        const firstRow = data.data[0];
                        const values = Object.values(firstRow);
                        if (values.length > 0) {
                            setResult(String(values[0]));
                        } else {
                            setResult('(empty row)');
                        }
                    } else {
                        setResult('(no result)');
                    }
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError('Error');
                    setLoading(false);
                    console.error(err);
                }
            }
        };

        fetchData();

        return () => { isMounted = false; };
    }, [query]);

    if (loading) return <span className="inline-block animate-pulse bg-gray-200 rounded px-1 min-w-[20px] h-[1em]" />;
    if (error) return <span className="text-red-500 text-sm" title={error}>!</span>;

    return <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1 rounded">{result}</span>;
};
