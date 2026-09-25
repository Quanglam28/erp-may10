const { pool } = require('../config/database');

async function read(work){const client=await pool.connect();try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const value=await work(client);await client.query('ROLLBACK');return value;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}

const columns=`d.id,d.ma_don_ban,d.ma_khach_hang,d.ngay_dat_hang,d.ngay_giao_hang_yc,d.tong_tien_hang,d.tien_giam_gia,d.tong_thanh_toan,d.trang_thai AS trang_thai_don_hang,
 k.ma_khach_hang AS ma_khach,k.ten_khach_hang,i.invoice_count,i.revenue,i.first_invoice_date,i.last_invoice_date,
 c.costing_count,c.total_cost,c.material_cost,c.labor_cost,c.overhead_cost,c.production_orders,
 CASE WHEN COALESCE(i.invoice_count,0)>0 AND COALESCE(c.costing_count,0)>0 THEN (i.revenue::numeric-c.total_cost::numeric)::text END AS profit,
 CASE WHEN COALESCE(i.invoice_count,0)>0 AND COALESCE(c.costing_count,0)>0 AND i.revenue::numeric<>0 THEN round((i.revenue::numeric-c.total_cost::numeric)/i.revenue::numeric*100,2)::text END AS margin,
 CASE WHEN COALESCE(i.invoice_count,0)=0 OR COALESCE(c.costing_count,0)=0 THEN 'insufficient' WHEN i.revenue::numeric-c.total_cost::numeric>0 THEN 'profit' WHEN i.revenue::numeric-c.total_cost::numeric<0 THEN 'loss' ELSE 'break_even' END AS data_status`;
const joins=`FROM public.don_ban_hang d JOIN public.khach_hang k ON k.id=d.ma_khach_hang LEFT JOIN invoice_totals i ON i.order_id=d.id LEFT JOIN cost_totals c ON c.order_id=d.id`;

function build(params={}){const values=[],conditions=[];const bind=value=>{values.push(value);return `$${values.length}`;};const from=params.from?bind(params.from):null,to=params.to?bind(params.to):null;const interval=(column)=>[from?`${column}>=(${from}::date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`:null,to?`${column}<((${to}::date+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')`:null].filter(Boolean).join(' AND ');const invoiceWhere=interval('h.ngay_xuat_hoa_don'),costingWhere=interval('g.ngay_tao');const ctes=`WITH invoice_totals AS (
 SELECT h.ma_don_ban_hang AS order_id,count(*)::int AS invoice_count,sum(h.tong_tien_truoc_thue)::text AS revenue,min(h.ngay_xuat_hoa_don) AS first_invoice_date,max(h.ngay_xuat_hoa_don) AS last_invoice_date
 FROM public.hoa_don_ban_hang h ${invoiceWhere?`WHERE ${invoiceWhere}`:''} GROUP BY h.ma_don_ban_hang
), latest_costing AS (
 SELECT DISTINCT ON (g.ma_lenh_san_xuat) g.* FROM public.gia_thanh_san_pham g WHERE g.ma_lenh_san_xuat IS NOT NULL AND g.trang_thai = 'da_duyet' ${costingWhere?`AND ${costingWhere}`:''} ORDER BY g.ma_lenh_san_xuat,g.ngay_tao DESC,g.id DESC
), cost_totals AS (
 SELECT lsx.ma_don_ban_hang AS order_id,count(g.id)::int AS costing_count,sum(g.tong_chi_phi)::text AS total_cost,sum(g.chi_phi_vat_lieu_truc_tiep)::text AS material_cost,sum(g.chi_phi_nhan_cong_truc_tiep)::text AS labor_cost,sum(g.chi_phi_san_xuat_chung)::text AS overhead_cost,string_agg(DISTINCT lsx.ma_lenh_san_xuat,', ' ORDER BY lsx.ma_lenh_san_xuat) AS production_orders
 FROM public.lenh_san_xuat lsx LEFT JOIN latest_costing g ON g.ma_lenh_san_xuat=lsx.id WHERE lsx.ma_don_ban_hang IS NOT NULL GROUP BY lsx.ma_don_ban_hang
)`;
  if(params.q){const p=bind(`%${params.q.replace(/[\\%_]/g,'\\$&')}%`);conditions.push(`(d.ma_don_ban ILIKE ${p} OR k.ma_khach_hang ILIKE ${p} OR k.ten_khach_hang ILIKE ${p})`);}if(params.customerId)conditions.push(`d.ma_khach_hang=${bind(params.customerId)}`);if(params.orderId)conditions.push(`d.id=${bind(params.orderId)}`);if(from||to){const orderRange=interval('d.ngay_dat_hang'),productionRange=interval('x.ngay_bat_dau');conditions.push(`(COALESCE(i.invoice_count,0)>0 OR COALESCE(c.costing_count,0)>0 OR (${orderRange}) OR EXISTS(SELECT 1 FROM public.lenh_san_xuat x WHERE x.ma_don_ban_hang=d.id AND ${productionRange}))`);}return{ctes,values,where:conditions.length?`WHERE ${conditions.join(' AND ')}`:''};}

function listOrderEfficiency(params){return read(async client=>{const query=build(params);const all=(await client.query(`${query.ctes} SELECT ${columns} ${joins} ${query.where} ORDER BY d.ngay_dat_hang DESC,d.id DESC`,query.values)).rows;const complete=all.filter(item=>item.data_status!=='insufficient');const sum=key=>complete.reduce((total,item)=>total+Number(item[key]),0).toString();const revenue=complete.length?sum('revenue'):null,cost=complete.length?sum('total_cost'):null,profit=complete.length?sum('profit'):null,margin=revenue!==null&&Number(revenue)!==0?(Number(profit)/Number(revenue)*100).toFixed(2):null;const total=all.length,totalPages=Math.max(1,Math.ceil(total/params.pageSize)),page=Math.min(params.page,totalPages);return{data:all.slice((page-1)*params.pageSize,page*params.pageSize),summary:{revenue,cost,profit,margin,complete_orders:complete.length,total_orders:total},pagination:{page,pageSize:params.pageSize,total,totalPages}};});}
function orderEfficiencyFilters(){return read(async client=>{const[orders,customers]=await Promise.all([client.query(`SELECT id,ma_don_ban FROM public.don_ban_hang ORDER BY ma_don_ban`),client.query(`SELECT id,ma_khach_hang,ten_khach_hang FROM public.khach_hang ORDER BY ten_khach_hang`)]);return{orders:orders.rows,customers:customers.rows,revenueBasis:'invoiced_pre_tax',costBasis:'saved_costing_result'};});}
function orderEfficiencyDetail(id){return read(async client=>{const query=build({orderId:id});return(await client.query(`${query.ctes} SELECT ${columns} ${joins} ${query.where}`,query.values)).rows[0]||null;});}

module.exports = { listOrderEfficiency, orderEfficiencyFilters, orderEfficiencyDetail };
