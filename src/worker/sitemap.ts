import { Context } from "hono";
import { topics } from "../data/topics";
import { difficulties } from "../data/difficulties";

export async function generateSitemap(c: Context) {
  try {
    const host = c.req.header("host") || "k3ssqlqvt37e2.mocha.app";
    const baseUrl = "https://" + host;
    
    // Build XML sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Login page (main entry point for guests)
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/login</loc>\n`;
    xml += '    <changefreq>daily</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '  </url>\n';
    
    // About page
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/about</loc>\n`;
    xml += '    <changefreq>monthly</changefreq>\n';
    xml += '    <priority>0.7</priority>\n';
    xml += '  </url>\n';
    
    // Blog index
    xml += '  <url>\n';
    xml += `    <loc>${baseUrl}/blog</loc>\n`;
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
    
    // Topic landing pages
    for (const topic of topics) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/es/topic/${topic.slug}</loc>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.9</priority>\n';
      xml += '  </url>\n';
    }
    
    // Difficulty landing pages
    for (const difficulty of difficulties) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/es/${difficulty.slug}</loc>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.9</priority>\n';
      xml += '  </url>\n';
    }
    
    xml += '</urlset>';
    
    return c.text(xml, 200, {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return c.text('Error generating sitemap', 500);
  }
}

export async function generateBlogSitemap(c: Context) {
  try {
    const host = c.req.header("host") || "k3ssqlqvt37e2.mocha.app";
    const baseUrl = "https://" + host;
    
    // Build XML sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Blog posts
    const { results: blogPosts } = await c.env.DB.prepare(
      `SELECT slug, published_at 
       FROM blog_posts 
       WHERE status = 'published'
       ORDER BY published_at DESC`
    ).all();
    
    for (const post of blogPosts) {
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
      xml += `    <lastmod>${new Date(post.published_at as string).toISOString().split('T')[0]}</lastmod>\n`;
      xml += '    <changefreq>monthly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    }
    
    xml += '</urlset>';
    
    return c.text(xml, 200, {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    });
  } catch (error) {
    console.error("Error generating blog sitemap:", error);
    return c.text('Error generating blog sitemap', 500);
  }
}
