export interface PublicServer {
    name: string;
    hostname: string;
    location: string;
    region: string;
    speed: string;
    tcpCongestion: string;
    ports: string;
    ipVersion: string;
}

export const publicServers: PublicServer[] = [
    // Europe - France
    {
        name: "online.net (France)",
        hostname: "ping.online.net",
        location: "France, Île-de-France",
        region: "Europe",
        speed: "100 Gbit/s",
        tcpCongestion: "BBR",
        ports: "5200-5209",
        ipVersion: "IPv4 | IPv6"
    },
    {
        name: "online.net (France, IPv6)",
        hostname: "ping6.online.net",
        location: "France, Île-de-France",
        region: "Europe",
        speed: "100 Gbit/s",
        tcpCongestion: "BBR",
        ports: "5200-5209",
        ipVersion: "IPv4 | IPv6"
    },
    {
        name: "moji.fr (France)",
        hostname: "iperf3.moji.fr",
        location: "France, Île-de-France",
        region: "Europe",
        speed: "100 Gbit/s",
        tcpCongestion: "BBR",
        ports: "5200-5240",
        ipVersion: "IPv4 | IPv6"
    },
    {
        name: "milkywan.fr (France)",
        hostname: "speedtest.milkywan.fr",
        location: "France, Île-de-France",
        region: "Europe",
        speed: "40 Gbit/s",
        tcpCongestion: "BBR",
        ports: "9200-9240",
        ipVersion: "IPv4 | IPv6"
    },
    {
        name: "as49434.net (France)",
        hostname: "iperf.par2.as49434.net",
        location: "France, Île-de-France",
        region: "Europe",
        speed: "40 Gbit/s",
        tcpCongestion: "unknown",
        ports: "9200-9240",
        ipVersion: "IPv4 | IPv6"
    },
    {
        name: "Bouygues (Paris BBR)",
        hostname: "paris.bbr.iperf.bytel.fr",
        location: "France, Paris",
        region: "Europe",
        speed: "10 Gbit/s",
        tcpCongestion: "BBR",
        ports: "9200-9240",
        ipVersion: "IPv4 | IPv6"
    },
    {
        name: "Bouygues (Paris Cubic)",
        hostname: "paris.cubic.iperf.bytel.fr",
        location: "France, Paris",
        region: "Europe",
        speed: "10 Gbit/s",
        tcpCongestion: "Cubic",
        ports: "9200-9240",
        ipVersion: "IPv4 | IPv6"
    },
    // Europe - Other
    {
        name: "serverius.net (Netherlands)",
        hostname: "speedtest.serverius.net",
        location: "Netherlands",
        region: "Europe",
        speed: "10 Gbit/s",
        tcpCongestion: "Cubic",
        ports: "5002",
        ipVersion: "IPv4 | IPv6"
    },
    {
        name: "iperf.014.fr (Netherlands)",
        hostname: "nl.iperf.014.fr",
        location: "Netherlands",
        region: "Europe",
        speed: "1 Gbit/s",
        tcpCongestion: "Cubic",
        ports: "10415-10420",
        ipVersion: "IPv4"
    },
    {
        name: "iperf.014.fr (Switzerland)",
        hostname: "ch.iperf.014.fr",
        location: "Switzerland",
        region: "Europe",
        speed: "3 Gbit/s",
        tcpCongestion: "Cubic",
        ports: "15315-15320",
        ipVersion: "IPv4"
    },
    {
        name: "eenet.ee (Estonia)",
        hostname: "iperf.eenet.ee",
        location: "Estonia",
        region: "Europe",
        speed: "unknown",
        tcpCongestion: "unknown",
        ports: "5201",
        ipVersion: "IPv4"
    },
    {
        name: "astra.in.ua (Ukraine)",
        hostname: "iperf.astra.in.ua",
        location: "Ukraine, Lviv",
        region: "Europe",
        speed: "10 Gbit/s",
        tcpCongestion: "unknown",
        ports: "5201-5206",
        ipVersion: "IPv4 | IPv6"
    },
    {
        name: "volia.net (Ukraine)",
        hostname: "iperf.volia.net",
        location: "Ukraine",
        region: "Europe",
        speed: "unknown",
        tcpCongestion: "BBR",
        ports: "5201",
        ipVersion: "IPv4"
    },
    // Africa
    {
        name: "angolacables.co.ao (Angola)",
        hostname: "iperf.angolacables.co.ao",
        location: "Angola, Luanda",
        region: "Africa",
        speed: "10 Gbit/s",
        tcpCongestion: "Cubic",
        ports: "9200-9240",
        ipVersion: "IPv4 | IPv6"
    },
    // Asia
    {
        name: "uztelecom.uz (Uzbekistan)",
        hostname: "speedtest.uztelecom.uz",
        location: "Uzbekistan, Tashkent",
        region: "Asia",
        speed: "10 Gbit/s",
        tcpCongestion: "HTCP",
        ports: "5200-5209",
        ipVersion: "IPv4 | IPv6"
    },
    {
        name: "biznetnetworks.com (Indonesia)",
        hostname: "iperf.biznetnetworks.com",
        location: "Indonesia",
        region: "Asia",
        speed: "1 Gbit/s",
        tcpCongestion: "unknown",
        ports: "5201-5203",
        ipVersion: "IPv4 | IPv6"
    },
    // Oceania
    {
        name: "vetta.online (New Zealand)",
        hostname: "speedtest-iperf-akl.vetta.online",
        location: "New Zealand, Auckland",
        region: "Oceania",
        speed: "10 Gbit/s",
        tcpCongestion: "unknown",
        ports: "5200-5209",
        ipVersion: "IPv4"
    },
    // Americas
    {
        name: "he.net (USA)",
        hostname: "iperf.he.net",
        location: "USA, California",
        region: "Americas",
        speed: "unknown",
        tcpCongestion: "unknown",
        ports: "5201",
        ipVersion: "IPv4 | IPv6"
    }
];
