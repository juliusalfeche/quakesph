<?php
header("Content-Type: application/xml; charset=utf-8");

$base_url = "https://juliusalfeche.com/quakesph";
$lastmod  = date("Y-m-d");

echo '<?xml version="1.0" encoding="UTF-8"?>';
?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc><?php echo $base_url; ?>/</loc>
    <lastmod><?php echo $lastmod; ?></lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>