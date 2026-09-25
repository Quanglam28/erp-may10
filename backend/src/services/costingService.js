const { pool } = require('../config/database');

async function read(work){const client=await pool.connect();try{await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const value=await work(client);await client.query('ROLLBACK');return value;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}

const base=`FROM public.lenh_san_xuat lsx
 JOIN public.san_pham sp ON sp.id=lsx.ma_san_pham
 LEFT JOIN public.don_vi_tinh dvt ON dvt.id=sp.ma_don_vi_tinh
 LEFT JOIN LATERAL (SELECT g.* FROM public.gia_thanh_san_pham g WHERE g.ma_lenh_san_xuat=lsx.id ORDER BY g.ngay_tao DESC,g.id DESC LIMIT 1) g ON true
 LEFT JOIN public.nguoi_dung u ON u.id=g.nguoi_tinh
 LEFT JOIN LATERAL (SELECT COALESCE(sum(ct.thanh_tien),0)::text AS chi_phi_nvl_nguon,count(*)::int AS so_dong_nguon
   FROM public.phieu_xuat_kho px JOIN public.chi_tiet_phieu_xuat ct ON ct.ma_phieu_xuat_kho=px.id
   WHERE px.ma_lenh_san_xuat=lsx.id AND px.loai_xuat='xuat_san_xuat' AND px.trang_thai='da_xuat') src ON true`;
const columns=`lsx.id AS lenh_san_xuat_id,lsx.ma_lenh_san_xuat,lsx.ngay_bat_dau,lsx.ngay_ket_thuc_yc,lsx.so_luong_yeu_cau,lsx.so_luong_hoan_thanh,lsx.trang_thai AS trang_thai_san_xuat,
 sp.id AS san_pham_id,sp.ma_san_pham,sp.ten_san_pham,dvt.ten_don_vi,
 g.id AS gia_thanh_id,g.ky_tinh_gia_thanh,g.so_luong_san_xuat,g.chi_phi_vat_lieu_truc_tiep,g.chi_phi_nhan_cong_truc_tiep,g.chi_phi_san_xuat_chung,g.tong_chi_phi,g.gia_thanh_don_vi,g.gia_ban_de_nghi,g.ghi_chu,g.trang_thai AS trang_thai_gia_thanh,g.ngay_tao,g.ngay_cap_nhat,u.ho_ten AS nguoi_tinh,
 src.chi_phi_nvl_nguon,src.so_dong_nguon,
 CASE WHEN g.id IS NOT NULL THEN (g.chi_phi_vat_lieu_truc_tiep+g.chi_phi_nhan_cong_truc_tiep+g.chi_phi_san_xuat_chung)::text END AS tong_chi_phi_tu_cau_thanh,
 CASE WHEN g.id IS NOT NULL THEN ((g.chi_phi_vat_lieu_truc_tiep+g.chi_phi_nhan_cong_truc_tiep+g.chi_phi_san_xuat_chung)=g.tong_chi_phi) END AS tong_chi_phi_khop,
 CASE WHEN g.id IS NOT NULL THEN (g.tong_chi_phi/g.so_luong_san_xuat)::text END AS gia_thanh_tu_cong_thuc,
 CASE WHEN g.id IS NOT NULL THEN ((g.tong_chi_phi/g.so_luong_san_xuat)=g.gia_thanh_don_vi) END AS gia_thanh_don_vi_khop`;

function parts(params){const values=[];const conditions=[];const bind=v=>{values.push(v);return `$${values.length}`;};if(params.q){const p=bind(`%${params.q.replace(/[\\%_]/g,'\\$&')}%`);conditions.push(`(lsx.ma_lenh_san_xuat ILIKE ${p} OR sp.ma_san_pham ILIKE ${p} OR sp.ten_san_pham ILIKE ${p})`);}if(params.objectId)conditions.push(`lsx.id=${bind(params.objectId)}`);if(params.from)conditions.push(`COALESCE(lsx.ngay_ket_thuc_yc,lsx.ngay_bat_dau)>=${bind(params.from)}::date`);if(params.to)conditions.push(`lsx.ngay_bat_dau<=${bind(params.to)}::date`);if(params.status==='calculated')conditions.push('g.id IS NOT NULL');if(params.status==='missing')conditions.push('g.id IS NULL');return{values,where:conditions.length?`WHERE ${conditions.join(' AND ')}`:'' ,bind};}

function listCosting(params){return read(async client=>{const{values,where,bind}=parts(params);const total=Number((await client.query(`SELECT count(*)::int AS total ${base} ${where}`,values)).rows[0].total);const totalPages=Math.max(1,Math.ceil(total/params.pageSize));const page=Math.min(params.page,totalPages);const limit=bind(params.pageSize),offset=bind((page-1)*params.pageSize);const data=(await client.query(`SELECT ${columns} ${base} ${where} ORDER BY COALESCE(g.ngay_tao,lsx.ngay_bat_dau) DESC,lsx.id DESC LIMIT ${limit} OFFSET ${offset}`,values)).rows;return{data,pagination:{page,pageSize:params.pageSize,total,totalPages}};});}
function costingFilters(){return read(async client=>{const [objects,periods]=await Promise.all([client.query(`SELECT lsx.id,lsx.ma_lenh_san_xuat,sp.ma_san_pham,sp.ten_san_pham FROM public.lenh_san_xuat lsx JOIN public.san_pham sp ON sp.id=lsx.ma_san_pham ORDER BY lsx.ma_lenh_san_xuat`),client.query(`SELECT DISTINCT ky_tinh_gia_thanh FROM public.gia_thanh_san_pham WHERE ky_tinh_gia_thanh IS NOT NULL ORDER BY ky_tinh_gia_thanh`)]);return{objects:objects.rows,periods:periods.rows.map(x=>x.ky_tinh_gia_thanh),capabilities:{materialSource:true,laborSource:false,overheadSource:false,openingWip:false,closingWip:false,allocationDetails:false}};});}
function costingDetail(id){return read(async client=>(await client.query(`SELECT ${columns} ${base} WHERE lsx.id=$1`,[id])).rows[0]||null);}

function costingHistory(productionOrderId) {
  return read(async (client) => (await client.query(`
    SELECT g.id, g.ma_lenh_san_xuat, g.ky_tinh_gia_thanh, g.so_luong_san_xuat,
           g.chi_phi_vat_lieu_truc_tiep, g.chi_phi_nhan_cong_truc_tiep,
           g.chi_phi_san_xuat_chung, g.tong_chi_phi, g.gia_thanh_don_vi,
           g.ghi_chu, g.trang_thai, g.ngay_tao, g.ngay_cap_nhat,
           g.nguoi_tinh, g.nguoi_tao, g.nguoi_cap_nhat,
           lsx.ma_lenh_san_xuat, sp.ma_san_pham, sp.ten_san_pham, u.ho_ten AS nguoi_tinh_ten
      FROM public.gia_thanh_san_pham g
      JOIN public.lenh_san_xuat lsx ON lsx.id = g.ma_lenh_san_xuat
      JOIN public.san_pham sp ON sp.id = g.ma_san_pham
      LEFT JOIN public.nguoi_dung u ON u.id = g.nguoi_tinh
     WHERE g.ma_lenh_san_xuat = $1
     ORDER BY g.ngay_tao DESC, g.id DESC
  `, [productionOrderId])).rows);
}

module.exports = { listCosting, costingFilters, costingDetail, costingHistory };

